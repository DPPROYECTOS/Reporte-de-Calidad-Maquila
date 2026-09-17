import { ProductComboItem, ProductComponentItem, PRODUCT_CATALOG, saveCustomCatalog } from '../data/productCatalog';
import { proxyDbGet, proxyDbGetAll, proxyDbPost, proxyDbDelete } from '../lib/supabase';

export interface CatalogUploadRecord {
  id: string;
  file_name: string;
  total_armados: number;
  total_componentes: number;
  armados_con_descripcion: number;
  upload_mode: 'replace' | 'append';
  source_type: 'excel' | 'csv' | 'pasted_text';
  status: 'completed' | 'failed' | 'processing';
  created_at: string;
}

export interface ProductionArmadoDbRow {
  sku: string;
  desc: string;
  category?: string;
  total_piezas?: number;
  componentes_count?: number;
  upload_id?: string;
  raw_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionComponenteDbRow {
  id?: number;
  armado_sku: string;
  componente_sku: string;
  componente_desc: string;
  cantidad: number;
  unidad?: string;
}

// Tamaño de lote optimizado (500 registros por inserción) para no saturar la red ni exceder límites
const BATCH_SIZE = 500;

/**
 * Reintenta la inserción de un lote si ocurre una desconexión temporal de red
 */
async function uploadBatchWithRetry(
  table: string,
  chunk: any[],
  retries = 3
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await proxyDbPost(table, chunk, true, false);
    if (!res.error) {
      return { success: true };
    }
    if (attempt < retries) {
      console.warn(`[Supabase] Reintentando lote en ${table} (intento ${attempt + 1}/${retries})...`, res.error);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } else {
      return { success: false, error: res.error };
    }
  }
  return { success: false, error: 'Error desconocido tras múltiples reintentos' };
}

/**
 * Carga el catálogo completo de armados y componentes desde Supabase.
 * Utiliza paginación automática en paralelo (proxyDbGetAll) para superar
 * la restricción estándar de 1,000 filas de PostgREST y descargar las 8,000+ completas.
 */
export async function syncCatalogFromSupabase(): Promise<{
  success: boolean;
  count: number;
  fromCloud: boolean;
  error?: string;
}> {
  try {
    // 1. Obtener TODOS los armados desde la tabla production_armados sin tope de 1000
    const armadosRes = await proxyDbGetAll<ProductionArmadoDbRow>('production_armados', {
      order: { column: 'sku', ascending: true },
    });

    if (armadosRes.error || !armadosRes.data || armadosRes.data.length === 0) {
      return {
        success: false,
        count: 0,
        fromCloud: false,
        error: armadosRes.error || 'No se encontraron registros en Supabase',
      };
    }

    const armadosRows = armadosRes.data;

    // 2. Obtener TODOS los componentes desde la tabla production_componentes sin tope con orden determinista
    const componentesRes = await proxyDbGetAll<ProductionComponenteDbRow>('production_componentes');
    const componentesRows = componentesRes.data || [];

    // Agrupar y DEDUPLICAR componentes estrictamente por armado_sku
    const componentesPorArmado = new Map<string, ProductComponentItem[]>();
    for (const comp of componentesRows) {
      const key = (comp.armado_sku || '').toUpperCase().trim();
      const compSku = (comp.componente_sku || '').toUpperCase().trim();
      if (!key || !compSku) continue;

      if (!componentesPorArmado.has(key)) {
        componentesPorArmado.set(key, []);
      }

      const list = componentesPorArmado.get(key)!;
      const existingIdx = list.findIndex(
        (c) => c.sku.toUpperCase() === compSku || (comp.componente_desc && c.desc.toUpperCase() === comp.componente_desc.toUpperCase())
      );

      if (existingIdx >= 0) {
        // El componente ya fue registrado para este armado: enriquecer descripción si faltaba pero NO duplicar
        if (comp.componente_desc && (!list[existingIdx].desc || list[existingIdx].desc === list[existingIdx].sku)) {
          list[existingIdx].desc = comp.componente_desc;
        }
      } else {
        list.push({
          sku: comp.componente_sku,
          desc: comp.componente_desc || comp.componente_sku,
          cantidad: Number(comp.cantidad) || 1,
          unidad: comp.unidad || 'pieza',
        });
      }
    }

    // 3. Unir en objetos ProductComboItem
    const fullItems: ProductComboItem[] = armadosRows.map((armado) => {
      const key = (armado.sku || '').toUpperCase().trim();
      const componentes = componentesPorArmado.get(key) || [];
      return {
        sku: armado.sku,
        desc: armado.desc || `ARMADO ${armado.sku}`,
        category: armado.category || 'Maquila / Armados',
        componentes,
      };
    });

    // 4. Guardar en memoria e IndexedDB local para acceso ultrarrápido offline
    if (fullItems.length > 0) {
      await saveCustomCatalog(fullItems, true);
    }

    return {
      success: true,
      count: fullItems.length,
      fromCloud: true,
    };
  } catch (err: any) {
    console.warn('Error sincronizando catálogo desde Supabase:', err);
    return {
      success: false,
      count: 0,
      fromCloud: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Guarda y sincroniza un catálogo masivo de armados y componentes en Supabase.
 * - Sube en bloques rápidos de 500 registros con tolerancia a fallos y reintentos.
 * - Deduplica claves primarias para prevenir conflictos ON CONFLICT en Postgres.
 * - Registra la auditoría en la tabla production_catalog_uploads.
 */
export async function uploadCatalogToSupabase(
  items: ProductComboItem[],
  options: {
    fileName?: string;
    mode: 'replace' | 'append';
    sourceType?: 'excel' | 'csv' | 'pasted_text';
    onProgress?: (progress: { stage: string; current: number; total: number; percentage: number }) => void;
  }
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { fileName = 'Archivo_Catalogo.xlsx', mode = 'replace', sourceType = 'excel', onProgress } = options;

    // 1. Deduplicar armados por SKU para prevenir colisiones en upsert de Postgres
    const deduplicatedArmadosMap = new Map<string, ProductComboItem>();
    items.forEach((it) => {
      const normalizedSku = (it.sku || '').toUpperCase().trim();
      if (!normalizedSku) return;

      if (!deduplicatedArmadosMap.has(normalizedSku)) {
        deduplicatedArmadosMap.set(normalizedSku, {
          ...it,
          componentes: it.componentes ? [...it.componentes] : [],
        });
      } else {
        // Si ya existe, combinar componentes y priorizar descripciones significativas
        const existing = deduplicatedArmadosMap.get(normalizedSku)!;
        const isExistingGeneric = !existing.desc || existing.desc.startsWith('ARMADO ') || existing.desc.toUpperCase() === normalizedSku;
        const isNewMeaningful = it.desc && !it.desc.startsWith('ARMADO ') && it.desc.toUpperCase() !== normalizedSku;

        if (isExistingGeneric && isNewMeaningful) {
          existing.desc = it.desc;
        }

        if (it.componentes && it.componentes.length > 0) {
          existing.componentes = existing.componentes || [];
          it.componentes.forEach((nc) => {
            const exists = existing.componentes!.some((ec) => ec.sku.toUpperCase() === nc.sku.toUpperCase());
            if (!exists) {
              existing.componentes!.push(nc);
            }
          });
        }
      }
    });

    const cleanItems = Array.from(deduplicatedArmadosMap.values());

    // Calcular estadísticas
    let totalComponentes = 0;
    let armadosConDesc = 0;
    cleanItems.forEach((item) => {
      totalComponentes += item.componentes?.length || 0;
      if (item.desc && !item.desc.startsWith('ARMADO ') && item.desc.toUpperCase() !== item.sku.toUpperCase()) {
        armadosConDesc++;
      }
    });

    // 2. Registrar en la tabla de auditoría production_catalog_uploads
    const uploadRecordId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const uploadMeta = {
      id: uploadRecordId,
      file_name: fileName,
      total_armados: cleanItems.length,
      total_componentes: totalComponentes,
      armados_con_descripcion: armadosConDesc,
      upload_mode: mode,
      source_type: sourceType,
      status: 'processing',
    };

    try {
      await proxyDbPost('production_catalog_uploads', uploadMeta, true, false);
    } catch (e) {
      console.warn('No se pudo registrar log de subida (tabla opcional):', e);
    }

    // 3. Si el modo es 'replace', vaciar tablas limpiamente
    if (mode === 'replace') {
      if (onProgress) {
        onProgress({ stage: 'Vaciando registros anteriores en Supabase...', current: 0, total: cleanItems.length, percentage: 5 });
      }
      try {
        await proxyDbDelete('production_componentes', undefined, { truncate: true });
        await proxyDbDelete('production_armados', undefined, { truncate: true });
      } catch (e) {
        console.warn('Advertencia al limpiar datos previos en Supabase:', e);
      }
    }

    // 4. Preparar filas de armados
    const armadoRows: ProductionArmadoDbRow[] = cleanItems.map((item) => {
      const compList = item.componentes || [];
      const totalPiezas = compList.reduce((acc, c) => acc + (Number(c.cantidad) || 1), 0);
      return {
        sku: item.sku.trim(),
        desc: (item.desc || `ARMADO ${item.sku}`).trim(),
        category: item.category || 'Maquila / Armados',
        total_piezas: totalPiezas,
        componentes_count: compList.length,
        upload_id: uploadRecordId,
      };
    });

    const totalArmadoBatches = Math.ceil(armadoRows.length / BATCH_SIZE);
    for (let i = 0; i < totalArmadoBatches; i++) {
      const start = i * BATCH_SIZE;
      const chunk = armadoRows.slice(start, start + BATCH_SIZE);
      const res = await uploadBatchWithRetry('production_armados', chunk, 3);
      if (!res.success) {
        console.error(`Error insertando lote ${i + 1} de armados en Supabase:`, res.error);
      }

      if (onProgress) {
        const percentage = Math.round(5 + ((i + 1) / totalArmadoBatches) * 45);
        onProgress({
          stage: `Subiendo armados a Supabase (Lote ${i + 1} de ${totalArmadoBatches}: ${Math.min(start + BATCH_SIZE, armadoRows.length)} de ${armadoRows.length})...`,
          current: Math.min(start + BATCH_SIZE, armadoRows.length),
          total: armadoRows.length,
          percentage,
        });
      }
    }

    // 5. Preparar e insertar `production_componentes` en lotes sin duplicados
    const componenteRows: ProductionComponenteDbRow[] = [];
    cleanItems.forEach((item) => {
      const seenCompSkus = new Set<string>();
      (item.componentes || []).forEach((c) => {
        const cSku = (c.sku || '').trim();
        if (!cSku) return;
        const normKey = cSku.toUpperCase();
        if (seenCompSkus.has(normKey)) return;
        seenCompSkus.add(normKey);

        componenteRows.push({
          armado_sku: item.sku.trim(),
          componente_sku: cSku,
          componente_desc: (c.desc || cSku).trim(),
          cantidad: Number(c.cantidad) || 1,
          unidad: c.unidad || 'pieza',
        });
      });
    });

    if (componenteRows.length > 0) {
      const totalCompBatches = Math.ceil(componenteRows.length / BATCH_SIZE);
      for (let j = 0; j < totalCompBatches; j++) {
        const start = j * BATCH_SIZE;
        const chunk = componenteRows.slice(start, start + BATCH_SIZE);
        const res = await uploadBatchWithRetry('production_componentes', chunk, 3);
        if (!res.success) {
          console.error(`Error insertando lote ${j + 1} de componentes en Supabase:`, res.error);
        }

        if (onProgress) {
          const percentage = Math.round(50 + ((j + 1) / totalCompBatches) * 45);
          onProgress({
            stage: `Subiendo insumos/piezas (Lote ${j + 1} de ${totalCompBatches}: ${Math.min(start + BATCH_SIZE, componenteRows.length)} de ${componenteRows.length})...`,
            current: Math.min(start + BATCH_SIZE, componenteRows.length),
            total: componenteRows.length,
            percentage,
          });
        }
      }
    }

    // 6. Actualizar estado de subida a completado
    try {
      await proxyDbPost(
        'production_catalog_uploads',
        {
          ...uploadMeta,
          status: 'completed',
        },
        true,
        false
      );
    } catch (_) {}

    if (onProgress) {
      onProgress({
        stage: `¡Catálogo completo guardado! (${cleanItems.length} armados y ${componenteRows.length} piezas)`,
        current: cleanItems.length,
        total: cleanItems.length,
        percentage: 100,
      });
    }

    return {
      success: true,
      count: cleanItems.length,
    };
  } catch (err: any) {
    console.error('Error en uploadCatalogToSupabase:', err);
    return {
      success: false,
      count: 0,
      error: err?.message || String(err),
    };
  }
}

/**
 * Borra todo el catálogo en Supabase (armados y componentes).
 */
export async function clearCatalogFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    await proxyDbDelete('production_componentes', undefined, { truncate: true });
    await proxyDbDelete('production_armados', undefined, { truncate: true });
    return { success: true };
  } catch (e: any) {
    console.error('Error vaciando catálogo en Supabase:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Obtiene el historial de subidas de archivos desde Supabase
 */
export async function fetchCatalogUploadHistory(): Promise<CatalogUploadRecord[]> {
  try {
    const res = await proxyDbGet<CatalogUploadRecord>('production_catalog_uploads', {
      limit: 10,
      order: { column: 'created_at', ascending: false },
    });
    return res.data || [];
  } catch (e) {
    return [];
  }
}
