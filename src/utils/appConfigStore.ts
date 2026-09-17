import { QualityReport, PhotoEvidenceCategory } from '../types/qualityReport';
import { proxyDbGet, proxyDbPost, proxyDbPut, proxyDbDelete } from '../lib/supabase';

export const INSPECTORS_STORAGE_KEY = 'cvdirecto_quality_inspectors_v1';
export const PHOTO_SECTIONS_STORAGE_KEY = 'cvdirecto_photo_sections_config_v1';

export const DEFAULT_INSPECTORS: string[] = [
  'Ing. Carlos Mendoza (Calidad)',
  'Lic. Laura Martínez (Calidad)',
  'Ing. Roberto Silva (Calidad)',
  'Ing. Mariana Gómez (Calidad)',
  'Tec. Alejandro Morales (Calidad)',
  'Supervisor de Turno (Calidad)',
];

export interface PhotoSectionConfig {
  id: string; // Identificador único (ej. 'photoInitial', 'section_1712345678')
  key: string; // Clave de almacenamiento dentro del reporte
  title: string;
  subtitle: string;
  guide: string;
  icon: string; // Emoji
  required: boolean; // Obligatoria para avanzar
  isStandard?: boolean; // Si es una de las 4 secciones estándar originales
  displayOrder?: number;
}

export const DEFAULT_PHOTO_SECTIONS: PhotoSectionConfig[] = [
  {
    id: 'photoInitial',
    key: 'photoInitial',
    title: '1. Pieza Inicial Liberada',
    subtitle: 'Primera pieza armada del lote',
    guide: 'Toma foto de cerca mostrando el producto armado completo para asegurar que está idéntico a la muestra patrón (puedes subir varias fotos de distintos ángulos).',
    icon: '🎯',
    required: true,
    isStandard: true,
    displayOrder: 1,
  },
  {
    id: 'photoProcess',
    key: 'photoProcess',
    title: '2. Proceso en el Módulo / Mesas',
    subtitle: 'Mesa de trabajo y personal armando',
    guide: 'Fotos del módulo o mesas de maquila donde se vea la estación de trabajo y el ensamble en curso.',
    icon: '🏭',
    required: true,
    isStandard: true,
    displayOrder: 2,
  },
  {
    id: 'photoReleasedPiece',
    key: 'photoReleasedPiece',
    title: '3. Empaque y Etiqueta del Cliente',
    subtitle: 'Caja con código de barras legible',
    guide: 'Fotos nítidas a las etiquetas (Amazon, MeLi, Coppel, etc.) verificando que el código y descripción se lean perfectamente.',
    icon: '📦',
    required: true,
    isStandard: true,
    displayOrder: 3,
  },
  {
    id: 'photoPalletized',
    key: 'photoPalletized',
    title: '4. Tarima Terminada y Emplayada',
    subtitle: 'Estiba con su etiqueta de lote',
    guide: 'Fotos completas de la tarima ya emplayada con sus esquineros y etiqueta de identificación de lote visible.',
    icon: '🏗️',
    required: true,
    isStandard: true,
    displayOrder: 4,
  },
];

// ==================== INSPECTORS STORE (LOCAL & SUPABASE) ====================

export function getStoredInspectors(): string[] {
  if (typeof window === 'undefined') return DEFAULT_INSPECTORS;
  try {
    const raw = localStorage.getItem(INSPECTORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((name) => typeof name === 'string' && name.trim() !== '');
      }
    }
  } catch (e) {
    console.warn('Error al leer inspectores locales:', e);
  }
  return DEFAULT_INSPECTORS;
}

export function saveStoredInspectors(inspectors: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = inspectors
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    localStorage.setItem(INSPECTORS_STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent('quality-inspectors-updated', { detail: cleaned }));
  } catch (e) {
    console.warn('Error al guardar inspectores locales:', e);
  }
}

export function resetStoredInspectors(): string[] {
  saveStoredInspectors(DEFAULT_INSPECTORS);
  return DEFAULT_INSPECTORS;
}

/**
 * Carga inspectores desde la tabla Supabase "quality_inspectors"
 * y sincroniza con el almacenamiento local.
 */
export async function syncInspectorsFromSupabase(): Promise<{ data: string[]; fromCloud: boolean }> {
  try {
    const res = await proxyDbGet<{ name: string; display_order: number; active: boolean }>(
      'quality_inspectors',
      {
        filters: [{ column: 'active', op: 'eq', value: true }],
        order: { column: 'display_order', ascending: true },
      }
    );

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const cloudInspectors = res.data.map((row) => row.name.trim()).filter(Boolean);
      if (cloudInspectors.length > 0) {
        saveStoredInspectors(cloudInspectors);
        return { data: cloudInspectors, fromCloud: true };
      }
    } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
      // Si la tabla está creada pero vacía, sembramos los valores iniciales
      await seedDefaultInspectorsToSupabase();
    }
  } catch (err) {
    console.warn('Supabase sync inspectors fallback:', err);
  }

  return { data: getStoredInspectors(), fromCloud: false };
}

/**
 * Inserta los inspectores iniciales en Supabase
 */
export async function seedDefaultInspectorsToSupabase(): Promise<void> {
  try {
    const records = DEFAULT_INSPECTORS.map((name, index) => ({
      name,
      display_order: index + 1,
      active: true,
    }));
    await proxyDbPost('quality_inspectors', records, true);
  } catch (err) {
    console.warn('Could not seed inspectors to Supabase:', err);
  }
}

/**
 * Agrega un nuevo inspector en Supabase
 */
export async function addInspectorToSupabase(name: string, order = 0): Promise<void> {
  try {
    await proxyDbPost('quality_inspectors', {
      name: name.trim(),
      display_order: order,
      active: true,
    }, true);
  } catch (err) {
    console.warn('Error guardando inspector en Supabase:', err);
  }
}

/**
 * Actualiza el nombre de un inspector en Supabase
 */
export async function updateInspectorInSupabase(oldName: string, newName: string): Promise<void> {
  try {
    await proxyDbPut(
      'quality_inspectors',
      { name: newName.trim(), updated_at: new Date().toISOString() },
      { name: oldName.trim() }
    );
  } catch (err) {
    console.warn('Error actualizando inspector en Supabase:', err);
  }
}

/**
 * Elimina o desactiva un inspector en Supabase
 */
export async function deleteInspectorFromSupabase(name: string): Promise<void> {
  try {
    await proxyDbDelete('quality_inspectors', { name: name.trim() });
  } catch (err) {
    console.warn('Error eliminando inspector en Supabase:', err);
  }
}

// ==================== PHOTO SECTIONS STORE (LOCAL & SUPABASE) ====================

export function getStoredPhotoSections(): PhotoSectionConfig[] {
  if (typeof window === 'undefined') return DEFAULT_PHOTO_SECTIONS;
  try {
    const raw = localStorage.getItem(PHOTO_SECTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error al leer secciones de fotos locales:', e);
  }
  return DEFAULT_PHOTO_SECTIONS;
}

export function saveStoredPhotoSections(sections: PhotoSectionConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PHOTO_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
    window.dispatchEvent(new CustomEvent('quality-photo-sections-updated', { detail: sections }));
  } catch (e) {
    console.warn('Error al guardar secciones de fotos locales:', e);
  }
}

export function resetStoredPhotoSections(): PhotoSectionConfig[] {
  saveStoredPhotoSections(DEFAULT_PHOTO_SECTIONS);
  return DEFAULT_PHOTO_SECTIONS;
}

/**
 * Sincroniza las secciones de fotos desde la tabla "photo_sections" de Supabase
 */
export async function syncPhotoSectionsFromSupabase(): Promise<{ data: PhotoSectionConfig[]; fromCloud: boolean }> {
  try {
    const res = await proxyDbGet<any>('photo_sections', {
      filters: [{ column: 'active', op: 'eq', value: true }],
      order: { column: 'display_order', ascending: true },
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const mapped: PhotoSectionConfig[] = res.data.map((row) => ({
        id: row.id,
        key: row.key || row.id,
        title: row.title,
        subtitle: row.subtitle || '',
        guide: row.guide || '',
        icon: row.icon || '📸',
        required: row.required !== false,
        isStandard: row.is_standard ?? false,
        displayOrder: row.display_order ?? 0,
      }));

      saveStoredPhotoSections(mapped);
      return { data: mapped, fromCloud: true };
    } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
      await seedDefaultPhotoSectionsToSupabase();
    }
  } catch (err) {
    console.warn('Supabase sync photo sections fallback:', err);
  }

  return { data: getStoredPhotoSections(), fromCloud: false };
}

/**
 * Inserta las secciones predeterminadas en Supabase
 */
export async function seedDefaultPhotoSectionsToSupabase(): Promise<void> {
  try {
    const records = DEFAULT_PHOTO_SECTIONS.map((sec, index) => ({
      id: sec.id,
      key: sec.key,
      title: sec.title,
      subtitle: sec.subtitle,
      guide: sec.guide,
      icon: sec.icon,
      required: sec.required,
      is_standard: sec.isStandard ?? true,
      display_order: index + 1,
      active: true,
    }));
    await proxyDbPost('photo_sections', records, true);
  } catch (err) {
    console.warn('Could not seed photo sections to Supabase:', err);
  }
}

/**
 * Guarda o actualiza una sección en Supabase
 */
export async function savePhotoSectionToSupabase(section: PhotoSectionConfig, order?: number): Promise<void> {
  try {
    await proxyDbPost(
      'photo_sections',
      {
        id: section.id,
        key: section.key || section.id,
        title: section.title,
        subtitle: section.subtitle,
        guide: section.guide,
        icon: section.icon,
        required: section.required,
        is_standard: section.isStandard ?? false,
        display_order: order ?? section.displayOrder ?? 0,
        active: true,
      },
      true
    );
  } catch (err) {
    console.warn('Error al guardar sección en Supabase:', err);
  }
}

/**
 * Actualiza una sección en Supabase
 */
export async function updatePhotoSectionInSupabase(section: PhotoSectionConfig): Promise<void> {
  try {
    await proxyDbPut(
      'photo_sections',
      {
        title: section.title,
        subtitle: section.subtitle,
        guide: section.guide,
        icon: section.icon,
        required: section.required,
        updated_at: new Date().toISOString(),
      },
      { id: section.id }
    );
  } catch (err) {
    console.warn('Error al actualizar sección en Supabase:', err);
  }
}

/**
 * Elimina una sección en Supabase
 */
export async function deletePhotoSectionFromSupabase(id: string): Promise<void> {
  try {
    await proxyDbDelete('photo_sections', { id });
  } catch (err) {
    console.warn('Error al eliminar sección en Supabase:', err);
  }
}

// ==================== REPORT PHOTO HELPERS ====================

const STANDARD_KEYS = new Set(['photoInitial', 'photoProcess', 'photoReleasedPiece', 'photoPalletized']);

/**
 * Obtiene el slot de evidencia de una sección para un reporte dado.
 */
export function getSectionPhotoSlot(report: QualityReport, sectionKey: string): PhotoEvidenceCategory {
  if (STANDARD_KEYS.has(sectionKey)) {
    const slot = (report as unknown as Record<string, PhotoEvidenceCategory>)[sectionKey];
    return slot || { captured: false, urls: [], note: '' };
  }
  const custom = report.customPhotos?.[sectionKey];
  if (custom) return custom;
  // Fallback si fue guardado directamente en report
  const direct = (report as unknown as Record<string, PhotoEvidenceCategory>)[sectionKey];
  return direct || { captured: false, urls: [], note: '' };
}

/**
 * Actualiza el slot de evidencia de una sección en un reporte.
 */
export function updateReportWithPhotoSlot(
  report: QualityReport,
  sectionKey: string,
  slot: PhotoEvidenceCategory
): QualityReport {
  if (STANDARD_KEYS.has(sectionKey)) {
    return {
      ...report,
      [sectionKey]: slot,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...report,
    customPhotos: {
      ...(report.customPhotos || {}),
      [sectionKey]: slot,
    },
    updatedAt: new Date().toISOString(),
  };
}
