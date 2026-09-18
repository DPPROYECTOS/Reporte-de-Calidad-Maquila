import { DefectCheckItem, DefectSeverity, DefectCategory } from '../types/qualityReport';

export interface ComboDefectPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[];
}

// Master General Defect Blocks Pool (Exactamente los 3 defectos disponibles en el Banco General de Defectos)
export const MASTER_GENERAL_DEFECT_BLOCKS: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[] = [
  {
    id: 'block-may-02',
    name: 'Rayón Visible >5mm en Cuerpo o Disco Difusor Abollado',
    severity: 'Mayor',
    category: 'Apariencia Físico-Cosmética',
    description: 'Rayadura que traspasa el esmalte exterior o golpe en la base de inducción de aluminio.',
  },
  {
    id: 'block-may-03',
    name: 'Caja Máster o Empaque Primario Roto / Aplastado',
    severity: 'Mayor',
    category: 'Empaque y Cajas',
    description: 'Cartón colapsado, esquinas vencidas o hendiduras que vulneran la integridad del producto.',
  },
  {
    id: 'block-men-03',
    name: 'Pequeño Pliegue en Cinta de Sellado sin Abertura',
    severity: 'Menor',
    category: 'Empaque y Cajas',
    description: 'Burbuja o pliegue estético en la cinta adhesiva, manteniendo el sellado hermético.',
  },
];

export const COMBO_DEFECT_PRESETS: ComboDefectPreset[] = [
  {
    id: 'general',
    name: 'Estándar Banco de Defectos',
    icon: '📋',
    description: 'Defectos activos oficiales en el Banco General (3 criterios).',
    items: MASTER_GENERAL_DEFECT_BLOCKS,
  },
  {
    id: 'cookware',
    name: 'Sartenes, Comales y Baterías Jade',
    icon: '🍳',
    description: 'Defectos configurados desde el banco general para armados y piezas de cocción.',
    items: MASTER_GENERAL_DEFECT_BLOCKS,
  },
  {
    id: 'knives',
    name: 'Cuchillería y Sets Chef',
    icon: '🔪',
    description: 'Defectos configurados desde el banco general para sets y kits.',
    items: MASTER_GENERAL_DEFECT_BLOCKS,
  },
  {
    id: 'marketplace',
    name: 'Combos Marketplace (Amazon / MeLi / Retail)',
    icon: '📦',
    description: 'Defectos configurados desde el banco general para canales de venta.',
    items: MASTER_GENERAL_DEFECT_BLOCKS,
  },
];

// Helper to auto-suggest a preset based on combo SKU or description
export function suggestPresetForCombo(sku: string, description: string, cliente: string = ''): ComboDefectPreset {
  const combined = `${sku} ${description} ${cliente}`.toUpperCase();

  if (combined.includes('CUCHILL') || combined.includes('CHEF') || combined.includes('FILO') || combined.includes('TIJERA')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'knives') || COMBO_DEFECT_PRESETS[0];
  }

  if (combined.includes('AMAZON') || combined.includes('MELI') || combined.includes('MERCADO') || combined.includes('SUBURBIA') || combined.includes('COPPEL')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'marketplace') || COMBO_DEFECT_PRESETS[0];
  }

  if (combined.includes('SARTEN') || combined.includes('COMAL') || combined.includes('BATERIA') || combined.includes('JADE') || combined.includes('CACEROLA') || combined.includes('OLLA')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'cookware') || COMBO_DEFECT_PRESETS[0];
  }

  return COMBO_DEFECT_PRESETS.find((p) => p.id === 'general') || COMBO_DEFECT_PRESETS[0];
}

// Helper to load stored custom defect blocks for a combo from localStorage
export function getStoredDefectsForCombo(sku: string): DefectCheckItem[] | null {
  if (!sku || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`cvd_defects_${sku}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filtrar para que solo existan los 3 defectos válidos del banco general
        const validIds = new Set(MASTER_GENERAL_DEFECT_BLOCKS.map((b) => b.id));
        const filtered = parsed.filter((it: DefectCheckItem) => {
          const rawId = it.id?.replace(new RegExp(`-${sku}$`), '');
          return validIds.has(it.id) || validIds.has(rawId);
        });
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (e) {
    console.warn('Error loading combo defects from storage:', e);
  }
  return null;
}

// Helper to save configured defect blocks for a combo to localStorage
export function saveStoredDefectsForCombo(sku: string, items: DefectCheckItem[]): void {
  if (!sku || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`cvd_defects_${sku}`, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving combo defects to storage:', e);
  }
}

