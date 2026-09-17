import {
  saveCatalogToIndexedDB,
  loadCatalogFromIndexedDB,
  clearCatalogFromIndexedDB,
} from '../utils/catalogIndexedDb';

export interface ProductComponentItem {
  sku: string; // Clave individual
  desc: string; // Descripción de la pieza individual
  cantidad: number; // Cantidad de piezas individuales por armado
  unidad?: string; // e.g. "pieza", "piezas"
}

export interface ProductComboItem {
  sku: string;
  desc: string;
  category?: string;
  componentes?: ProductComponentItem[];
}

/**
 * Catálogo base de armados.
 * Se inicia completamente vacío para que no contenga claves ejemplo ficticias.
 * Toda la información provendrá del Excel o CSV que cargue el usuario.
 */
export const PRODUCT_CATALOG: ProductComboItem[] = [];

export const DEFAULT_PRODUCT_CATALOG: ProductComboItem[] = [];

const LEGACY_STORAGE_KEY = 'MAQUILA_PRODUCT_CATALOG_CUSTOM_V2';

// Lista negra de claves ejemplo obsoletas que deben purgarse si quedaron en caché
const OBSOLETE_EXAMPLE_SKUS = new Set([
  'C0192-01',
  'C0192-00',
  'C0192-02',
  'C0190-00',
  'C0190-02',
  'C0191-00',
  'C0193-00',
  'C0194-00',
  'C0195-00',
  'C0199-00',
  'C0360-00',
  'C0360-01',
  'C0360-02',
  'C0450-00',
  'C0450-01',
  'C0557-00',
  'C0600-01',
  'C0600-02',
  'C0800-01',
]);

/**
 * Migra o limpia cualquier catálogo previo guardado en localStorage.
 */
export function getStoredCustomCatalog(): ProductComboItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item) => {
          if (!item || !item.sku) return false;
          if (parsed.length > 50) return true;
          return !OBSOLETE_EXAMPLE_SKUS.has(item.sku.toUpperCase());
        });

        if (cleaned.length > 0) {
          // Migrar asíncronamente a IndexedDB y liberar localStorage
          saveCatalogToIndexedDB(cleaned).catch(() => {});
          try {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch (_) {}
          return cleaned;
        }
      }
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch (_) {}
    }
  } catch (e) {
    console.error('Error reading legacy stored custom catalog', e);
  }
  return null;
}

/**
 * Guarda el catálogo masivo en memoria e IndexedDB, evitando exceder la cuota de localStorage.
 */
export async function saveCustomCatalog(items: ProductComboItem[], replace: boolean = true): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    let finalItems: ProductComboItem[] = [];

    if (replace) {
      finalItems = [...items];
    } else {
      // Combinación inteligente con los existentes
      const existingMap = new Map<string, ProductComboItem>();
      PRODUCT_CATALOG.forEach((item) => {
        existingMap.set(item.sku.toUpperCase(), {
          ...item,
          componentes: item.componentes ? [...item.componentes] : [],
        });
      });

      items.forEach((newItem) => {
        const key = newItem.sku.toUpperCase();
        if (existingMap.has(key)) {
          const existing = existingMap.get(key)!;

          // Si el nuevo elemento trae una descripción real, actualizarla
          const isNewGeneric = !newItem.desc || newItem.desc.toUpperCase() === `ARMADO ${key}` || newItem.desc.toUpperCase() === key;
          if (!isNewGeneric) {
            existing.desc = newItem.desc;
          }

          if (newItem.category && newItem.category !== 'Maquila / Armados') {
            existing.category = newItem.category;
          }

          // Combinar componentes individuales
          if (newItem.componentes && newItem.componentes.length > 0) {
            if (!existing.componentes || existing.componentes.length === 0) {
              existing.componentes = [...newItem.componentes];
            } else {
              newItem.componentes.forEach((nc) => {
                const cIdx = existing.componentes!.findIndex(
                  (ec) => ec.sku.toUpperCase() === nc.sku.toUpperCase()
                );
                if (cIdx >= 0) {
                  existing.componentes![cIdx] = { ...nc };
                } else {
                  existing.componentes!.push({ ...nc });
                }
              });
            }
          }
        } else {
          existingMap.set(key, { ...newItem });
        }
      });

      finalItems = Array.from(existingMap.values());
    }

    // Garantizar que ningún armado contenga componentes duplicados en memoria ni en IndexedDB
    finalItems = finalItems.map((item) => {
      if (!item.componentes || item.componentes.length === 0) return item;
      const seen = new Set<string>();
      const cleanComps: ProductComponentItem[] = [];
      for (const c of item.componentes) {
        const key = (c.sku || c.desc || '').toUpperCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        cleanComps.push({ ...c });
      }
      return {
        ...item,
        componentes: cleanComps,
      };
    });

    // 1. Actualización inmediata en memoria para respuesta instantánea de la UI
    PRODUCT_CATALOG.length = 0;
    PRODUCT_CATALOG.push(...finalItems);

    // 2. Notificar a los componentes
    window.dispatchEvent(new CustomEvent('product-catalog-updated', { detail: finalItems }));

    // 3. Persistencia duradera en IndexedDB (soporta miles de registros sin límite de cuota)
    await saveCatalogToIndexedDB(finalItems);

    // 4. Liberar localStorage por si existía clave previa
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_) {}
  } catch (e) {
    console.error('Error saving custom catalog to storage', e);
  }
}

/**
 * Limpia el catálogo y restablece a estado vacío
 */
export async function resetCustomCatalog(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_) {}
    await clearCatalogFromIndexedDB();
    PRODUCT_CATALOG.length = 0;
    window.dispatchEvent(new CustomEvent('product-catalog-updated', { detail: [] }));
  } catch (e) {
    console.error('Error resetting catalog', e);
  }
}

// Inicialización en carga de módulo (sincrónico inicial + carga duradera desde IndexedDB)
if (typeof window !== 'undefined') {
  // 1. Cargar datos inmediatos si existían en localStorage
  const legacy = getStoredCustomCatalog();
  if (legacy && legacy.length > 0) {
    PRODUCT_CATALOG.length = 0;
    PRODUCT_CATALOG.push(...legacy);
  }

  // 2. Cargar asíncronamente desde IndexedDB
  loadCatalogFromIndexedDB().then((indexedItems) => {
    if (indexedItems && indexedItems.length > 0) {
      PRODUCT_CATALOG.length = 0;
      PRODUCT_CATALOG.push(...indexedItems);
      window.dispatchEvent(new CustomEvent('product-catalog-updated', { detail: indexedItems }));
    }
  }).catch((err) => {
    console.warn('Could not read catalog from IndexedDB on startup:', err);
  });
}

/**
 * Búsqueda optimizada de armados por clave o descripción
 */
export function searchProductCatalog(query: string): ProductComboItem[] {
  const clean = query.trim().toUpperCase();
  if (!clean) {
    return PRODUCT_CATALOG.slice(0, 10);
  }

  // 1. Coincidencia exacta o prefijo en clave armada
  const prefixSkuMatches = PRODUCT_CATALOG.filter((item) =>
    item.sku.toUpperCase().startsWith(clean)
  );

  // 2. Coincidencia en clave armada que no empiece con el query
  const subSkuMatches = PRODUCT_CATALOG.filter(
    (item) =>
      !item.sku.toUpperCase().startsWith(clean) &&
      item.sku.toUpperCase().includes(clean)
  );

  // 3. Coincidencia en descripción del armado o en claves individuales que contiene
  const descMatches = PRODUCT_CATALOG.filter((item) => {
    if (item.sku.toUpperCase().includes(clean)) return false;
    if (item.desc.toUpperCase().includes(clean)) return true;
    // También buscar si la clave individual que busca está dentro de este armado
    if (item.componentes?.some((c) => c.sku.toUpperCase().includes(clean) || c.desc.toUpperCase().includes(clean))) {
      return true;
    }
    return false;
  });

  return [...prefixSkuMatches, ...subSkuMatches, ...descMatches];
}
