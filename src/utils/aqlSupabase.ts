import { AQLTarget, InspectionLevel } from '../types/qualityReport';
import { calculateAQLPlan, SamplingResult } from './aqlTable';
import { proxyDbGet, proxyDbPost, proxyDbPut } from '../lib/supabase';

export interface AqlSamplingRuleRow {
  id?: number | string;
  lot_min: number;
  lot_max: number;
  inspection_level: InspectionLevel;
  code_letter: string;
  sample_size: number;
  aql_target: number;
  ac: number;
  re: number;
  procedure_code?: string;
  standard_name?: string;
  notes?: string;
  updated_at?: string;
}

export interface AqlSamplingConfig {
  id: string;
  default_level: InspectionLevel;
  default_aql: AQLTarget;
  procedure_code: string;
  standard_name: string;
  normative_text: string;
  updated_at?: string;
}

const AQL_RULES_CACHE_KEY = 'cvd_aql_sampling_rules_cache_v1';
const AQL_CONFIG_CACHE_KEY = 'cvd_aql_sampling_config_cache_v1';

export const DEFAULT_AQL_CONFIG: AqlSamplingConfig = {
  id: 'default',
  default_level: 'General II',
  default_aql: 1.5,
  procedure_code: 'Anexo 8 CVD-AMA-PR-01',
  standard_name: 'Norma Militar ANSI / ASQ Z1.4',
  normative_text:
    'Las órdenes de maquila se inspeccionan con Nivel General II y AQL 1.5% Normal (Procedimiento CVD-AMA-PR-01).',
};

/**
 * Obtiene las reglas AQL desde almacenamiento local (caché offline).
 */
export function getLocalAqlRules(): AqlSamplingRuleRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AQL_RULES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error leyendo reglas AQL locales:', e);
  }
  return [];
}

/**
 * Guarda las reglas AQL en caché local.
 */
export function saveLocalAqlRules(rules: AqlSamplingRuleRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AQL_RULES_CACHE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Error guardando reglas AQL en caché local:', e);
  }
}

/**
 * Carga las reglas AQL desde Supabase.
 */
export async function fetchAqlRulesFromSupabase(): Promise<{
  success: boolean;
  data: AqlSamplingRuleRow[];
  fromCloud: boolean;
  error?: string;
}> {
  try {
    const res = await proxyDbGet<AqlSamplingRuleRow>('aql_sampling_rules', {
      limit: 1000,
      order: { column: 'lot_min', ascending: true },
    });

    if (res.data && res.data.length > 0) {
      saveLocalAqlRules(res.data);
      return { success: true, data: res.data, fromCloud: true };
    }

    // Si la tabla aún no existe o está vacía, retornar reglas locales
    const local = getLocalAqlRules();
    return { success: true, data: local, fromCloud: false };
  } catch (err: any) {
    console.warn('Error conectando con tabla aql_sampling_rules en Supabase:', err);
    return {
      success: false,
      data: getLocalAqlRules(),
      fromCloud: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Actualiza o edita una regla AQL en Supabase y localmente.
 */
export async function updateAqlRuleInSupabase(
  rule: AqlSamplingRuleRow
): Promise<{ success: boolean; error?: string }> {
  // 1. Actualizar en caché local
  const current = getLocalAqlRules();
  const updated = current.map((r) =>
    r.id === rule.id ||
    (r.lot_min === rule.lot_min &&
      r.lot_max === rule.lot_max &&
      r.inspection_level === rule.inspection_level &&
      r.aql_target === rule.aql_target)
      ? { ...r, ...rule, updated_at: new Date().toISOString() }
      : r
  );
  saveLocalAqlRules(updated);

  // 2. Actualizar en Supabase
  try {
    if (rule.id) {
      const res = await proxyDbPut(
        'aql_sampling_rules',
        {
          sample_size: rule.sample_size,
          ac: rule.ac,
          re: rule.re,
          notes: rule.notes || '',
          updated_at: new Date().toISOString(),
        },
        rule.id
      );
      if (res.error) return { success: false, error: res.error };
    } else {
      // Upsert
      const res = await proxyDbPost('aql_sampling_rules', [rule], true);
      if (res.error) return { success: false, error: res.error };
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Error guardando regla AQL en Supabase:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Registra en Supabase cuando un cálculo de muestreo se aplica a un lote/reporte.
 */
export async function logAqlCalculationToSupabase(log: {
  lot_size: number;
  inspection_level: InspectionLevel;
  aql_target: number;
  code_letter: string;
  sample_size: number;
  ac: number;
  re: number;
  report_id?: string;
  sku_armado?: string;
}): Promise<void> {
  try {
    await proxyDbPost(
      'aql_calculation_logs',
      {
        ...log,
        created_at: new Date().toISOString(),
      },
      false
    );
  } catch (err) {
    console.warn('Advertencia registrando log de AQL en Supabase:', err);
  }
}

/**
 * Calcula el plan AQL consultando primero las reglas de Supabase si existen,
 * o usando el algoritmo matemático estándar ANSI/ASQ Z1.4.
 */
export function calculateAQLWithSupabaseRules(
  lotSize: number,
  level: InspectionLevel = 'General II',
  aql: AQLTarget = 1.5,
  cloudRules: AqlSamplingRuleRow[] = []
): SamplingResult {
  const safeLot = Math.max(2, lotSize || 0);

  // Si tenemos reglas cargadas de Supabase, buscar coincidencia exacta
  if (cloudRules.length > 0) {
    const match = cloudRules.find(
      (r) =>
        safeLot >= r.lot_min &&
        safeLot <= r.lot_max &&
        r.inspection_level === level &&
        Math.abs(Number(r.aql_target) - Number(aql)) < 0.01
    );

    if (match) {
      return {
        codeLetter: match.code_letter,
        sampleSize: Math.min(match.sample_size, safeLot),
        ac: match.ac,
        re: match.re,
      };
    }
  }

  // Fallback al cálculo estándar ANSI / ASQ Z1.4
  return calculateAQLPlan(safeLot, level, aql);
}
