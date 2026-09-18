import { DefectCheckItem, DefectSeverity, DefectCategory } from '../types/qualityReport';
import { MASTER_GENERAL_DEFECT_BLOCKS, saveStoredDefectsForCombo, getStoredDefectsForCombo } from './comboDefectPresets';
import { proxyDbGet, proxyDbPost, proxyDbPut, proxyDbDelete } from '../lib/supabase';

export interface MasterDefectItem {
  id: string;
  name: string;
  severity: DefectSeverity;
  category: DefectCategory;
  description: string;
  sort_order?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ComboDefectRow {
  id?: number;
  sku_armado: string;
  defect_id: string;
  name: string;
  severity: DefectSeverity;
  category: DefectCategory;
  description?: string;
  sort_order?: number;
}

const MASTER_DEFECTS_STORAGE_KEY = 'cvd_master_defects_pool_v1';

/**
 * Obtiene la lista local almacenada en localStorage o la lista por defecto.
 */
export function getLocalMasterDefects(): MasterDefectItem[] {
  if (typeof window === 'undefined') return MASTER_GENERAL_DEFECT_BLOCKS as MasterDefectItem[];
  try {
    const raw = localStorage.getItem(MASTER_DEFECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error leyendo banco general local:', e);
  }
  return MASTER_GENERAL_DEFECT_BLOCKS as MasterDefectItem[];
}

/**
 * Guarda la lista maestra localmente en localStorage.
 */
export function saveLocalMasterDefects(items: MasterDefectItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MASTER_DEFECTS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('master-defects-updated', { detail: items }));
  } catch (e) {
    console.warn('Error guardando banco general local:', e);
  }
}

/**
 * Carga el banco general de defectos desde Supabase. Si la tabla está vacía,
 * siembra automáticamente los 18 defectos predeterminados en Supabase.
 */
export async function syncMasterDefectsFromSupabase(): Promise<{
  success: boolean;
  data: MasterDefectItem[];
  fromCloud: boolean;
  error?: string;
}> {
  try {
    const res = await proxyDbGet<MasterDefectItem>('defect_master_pool', {
      limit: 1000,
      order: { column: 'sort_order', ascending: true },
    });

    if (res.data && res.data.length > 0) {
      // Normalizar datos de Supabase
      const cloudItems: MasterDefectItem[] = res.data.map((row) => ({
        id: row.id,
        name: row.name,
        severity: row.severity,
        category: row.category,
        description: row.description || '',
        sort_order: row.sort_order || 0,
        is_system: row.is_system,
      }));

      saveLocalMasterDefects(cloudItems);
      return { success: true, data: cloudItems, fromCloud: true };
    }

    // Si la tabla no tiene registros aún, sembrar la base inicial
    const localItems = getLocalMasterDefects();
    if (!res.error) {
      // Intentar sembrar en Supabase en segundo plano
      seedMasterDefectsToSupabase(localItems).catch((err) => {
        console.warn('No se pudo sembrar defectos iniciales en Supabase:', err);
      });
    }

    return { success: true, data: localItems, fromCloud: false };
  } catch (err: any) {
    console.warn('Error sincronizando banco general desde Supabase:', err);
    return {
      success: false,
      data: getLocalMasterDefects(),
      fromCloud: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Inserta los defectos iniciales en la base de datos de Supabase si está vacía.
 */
export async function seedMasterDefectsToSupabase(items: MasterDefectItem[]): Promise<void> {
  const rows = items.map((it, idx) => ({
    id: it.id,
    name: it.name,
    severity: it.severity,
    category: it.category,
    description: it.description || '',
    sort_order: idx + 1,
    is_system: true,
  }));
  await proxyDbPost('defect_master_pool', rows, true);
}

/**
 * Crea un nuevo defecto en el banco general (local y Supabase).
 */
export async function createMasterDefect(defect: Omit<MasterDefectItem, 'id'> & { id?: string }): Promise<{
  success: boolean;
  item: MasterDefectItem;
  error?: string;
}> {
  const newId = defect.id || `defect-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newItem: MasterDefectItem = {
    id: newId,
    name: defect.name.trim(),
    severity: defect.severity,
    category: defect.category,
    description: defect.description?.trim() || '',
    sort_order: defect.sort_order || 999,
    is_system: false,
  };

  // 1. Guardar localmente
  const current = getLocalMasterDefects();
  const updated = [newItem, ...current];
  saveLocalMasterDefects(updated);

  // 2. Guardar en Supabase
  try {
    const res = await proxyDbPost('defect_master_pool', newItem, true);
    if (res.error) {
      console.warn('Advertencia al crear defecto en Supabase:', res.error);
    }
  } catch (e: any) {
    console.warn('Error enviando nuevo defecto a Supabase:', e);
  }

  return { success: true, item: newItem };
}

/**
 * Actualiza un defecto existente en el banco general (local y Supabase).
 */
export async function updateMasterDefect(defect: MasterDefectItem): Promise<{
  success: boolean;
  item: MasterDefectItem;
  error?: string;
}> {
  // 1. Actualizar localmente
  const current = getLocalMasterDefects();
  const updated = current.map((it) => (it.id === defect.id ? { ...it, ...defect } : it));
  saveLocalMasterDefects(updated);

  // 2. Actualizar en Supabase
  try {
    const res = await proxyDbPut(
      'defect_master_pool',
      {
        name: defect.name,
        severity: defect.severity,
        category: defect.category,
        description: defect.description,
        updated_at: new Date().toISOString(),
      },
      defect.id
    );
    if (res.error) {
      console.warn('Advertencia actualizando defecto en Supabase:', res.error);
    }
  } catch (e) {
    console.warn('Error enviando actualización a Supabase:', e);
  }

  return { success: true, item: defect };
}

/**
 * Elimina un defecto del banco general (local y Supabase).
 */
export async function deleteMasterDefect(id: string): Promise<{ success: boolean; error?: string }> {
  // 1. Eliminar localmente
  const current = getLocalMasterDefects();
  const updated = current.filter((it) => it.id !== id);
  saveLocalMasterDefects(updated);

  // 2. Eliminar en Supabase
  try {
    const res = await proxyDbDelete('defect_master_pool', id);
    if (res.error) {
      console.warn('Advertencia eliminando defecto en Supabase:', res.error);
    }
  } catch (e) {
    console.warn('Error eliminando en Supabase:', e);
  }

  return { success: true };
}

/**
 * Carga los defectos configurados para un SKU específico desde Supabase o localStorage.
 */
export async function loadComboDefectsFromSupabase(skuArmado: string): Promise<{
  success: boolean;
  data: DefectCheckItem[];
  fromCloud: boolean;
}> {
  if (!skuArmado) {
    return { success: false, data: [], fromCloud: false };
  }

  try {
    const res = await proxyDbGet<ComboDefectRow>('combo_defect_matrix', {
      limit: 200,
      filters: [{ column: 'sku_armado', op: 'eq', value: skuArmado }],
      order: { column: 'sort_order', ascending: true },
    });

    if (res.data && res.data.length > 0) {
      // Filtrar y normalizar exclusivamente con los defectos existentes en el Banco General
      const validPoolIds = new Set(MASTER_GENERAL_DEFECT_BLOCKS.map((b) => b.id));
      const filteredRows = res.data.filter((row) => {
        const rawDefectId = row.defect_id?.replace(new RegExp(`-${skuArmado}$`), '');
        return validPoolIds.has(row.defect_id) || validPoolIds.has(rawDefectId);
      });

      const sourceRows = filteredRows.length > 0 ? filteredRows : res.data;
      const items: DefectCheckItem[] = sourceRows.map((row) => ({
        id: row.defect_id.endsWith(`-${skuArmado}`) ? row.defect_id : `${row.defect_id}-${skuArmado}`,
        name: row.name,
        severity: row.severity,
        category: row.category,
        description: row.description || '',
        defectsFound: 0,
        passed: true,
      }));

      saveStoredDefectsForCombo(skuArmado, items);
      return { success: true, data: items, fromCloud: true };
    }
  } catch (e) {
    console.warn('Error cargando combo matrix desde Supabase:', e);
  }

  // Fallback a almacenamiento local o directamente los 3 bloques oficiales del banco
  const local = getStoredDefectsForCombo(skuArmado);
  if (local && local.length > 0) {
    return {
      success: true,
      data: local,
      fromCloud: false,
    };
  }

  const defaultMasterItems: DefectCheckItem[] = MASTER_GENERAL_DEFECT_BLOCKS.map((it) => ({
    id: `${it.id}-${skuArmado}`,
    name: it.name,
    severity: it.severity,
    category: it.category,
    description: it.description || '',
    defectsFound: 0,
    passed: true,
  }));

  return {
    success: true,
    data: defaultMasterItems,
    fromCloud: false,
  };
}

/**
 * Guarda los defectos asociados a un SKU en Supabase y localmente.
 */
export async function saveComboDefectsToSupabase(
  skuArmado: string,
  items: DefectCheckItem[]
): Promise<{ success: boolean; error?: string }> {
  if (!skuArmado) return { success: false, error: 'SKU requerido' };

  // 1. Guardar localmente
  saveStoredDefectsForCombo(skuArmado, items);

  // 2. Guardar en Supabase: primero borramos registros previos del SKU y luego insertamos los nuevos
  try {
    await proxyDbDelete('combo_defect_matrix', { sku_armado: skuArmado });

    if (items.length > 0) {
      const rows: ComboDefectRow[] = items.map((it, idx) => ({
        sku_armado: skuArmado,
        defect_id: it.id,
        name: it.name,
        severity: it.severity,
        category: it.category,
        description: it.description || '',
        sort_order: idx + 1,
      }));

      const postRes = await proxyDbPost('combo_defect_matrix', rows, true);
      if (postRes.error) {
        console.warn('Advertencia guardando combo_defect_matrix en Supabase:', postRes.error);
        return { success: false, error: postRes.error };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error en saveComboDefectsToSupabase:', err);
    return { success: false, error: err?.message || String(err) };
  }
}
