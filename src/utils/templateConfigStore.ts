import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import { proxyDbGet, proxyDbPost } from '../lib/supabase';

export const TEMPLATE_CONFIG_STORAGE_KEY = 'cvdirecto_template_config_v1';
export const OFFICIAL_TEMPLATE_RECORD_ID = 'cvdirecto_official';

export interface TemplatePresetRecord {
  id: string;
  name: string;
  sectionHeaderBg: string;
  sectionHeaderText: string;
  border: string;
  cellLabelBg: string;
  cellLabelText: string;
  cellValueText: string;
  titleText: string;
  metaBg: string;
  displayOrder?: number;
  isSystem?: boolean;
}

export const SYSTEM_PRESETS: TemplatePresetRecord[] = [
  {
    id: 'clasico_institucional',
    name: 'Clásico Institucional (Predeterminado)',
    sectionHeaderBg: '#1A1A1A',
    sectionHeaderText: '#FFFFFF',
    border: '#1A1A1A',
    cellLabelBg: '#F3F4F6',
    cellLabelText: '#1F2937',
    cellValueText: '#111827',
    titleText: '#111827',
    metaBg: '#FAF9F6',
    displayOrder: 1,
    isSystem: true,
  },
  {
    id: 'azul_marino_corporativo',
    name: 'Azul Marino Corporativo',
    sectionHeaderBg: '#0F172A',
    sectionHeaderText: '#FFFFFF',
    border: '#1E293B',
    cellLabelBg: '#F1F5F9',
    cellLabelText: '#0F172A',
    cellValueText: '#0F172A',
    titleText: '#0F172A',
    metaBg: '#F8FAFC',
    displayOrder: 2,
    isSystem: true,
  },
  {
    id: 'verde_calidad_iso',
    name: 'Verde Calidad ISO',
    sectionHeaderBg: '#064E3B',
    sectionHeaderText: '#FFFFFF',
    border: '#064E3B',
    cellLabelBg: '#ECFDF5',
    cellLabelText: '#064E3B',
    cellValueText: '#064E3B',
    titleText: '#064E3B',
    metaBg: '#F0FDF4',
    displayOrder: 3,
    isSystem: true,
  },
  {
    id: 'azul_cobalto_operaciones',
    name: 'Azul Cobalto Operaciones',
    sectionHeaderBg: '#1E3A8A',
    sectionHeaderText: '#FFFFFF',
    border: '#1E3A8A',
    cellLabelBg: '#EFF6FF',
    cellLabelText: '#1E3A8A',
    cellValueText: '#1E3A8A',
    titleText: '#1E3A8A',
    metaBg: '#F8FAFC',
    displayOrder: 4,
    isSystem: true,
  },
  {
    id: 'grafito_minimalista',
    name: 'Grafito Minimalista',
    sectionHeaderBg: '#374151',
    sectionHeaderText: '#FFFFFF',
    border: '#4B5563',
    cellLabelBg: '#F3F4F6',
    cellLabelText: '#111827',
    cellValueText: '#111827',
    titleText: '#111827',
    metaBg: '#F9FAFB',
    displayOrder: 5,
    isSystem: true,
  },
  {
    id: 'tinto_ejecutivo',
    name: 'Tinto Ejecutivo',
    sectionHeaderBg: '#881337',
    sectionHeaderText: '#FFFFFF',
    border: '#881337',
    cellLabelBg: '#FFF1F2',
    cellLabelText: '#4C0519',
    cellValueText: '#4C0519',
    titleText: '#4C0519',
    metaBg: '#FFF5F5',
    displayOrder: 6,
    isSystem: true,
  },
];

// ==================== ALMACENAMIENTO LOCAL ====================

export function getStoredTemplateConfig(): SheetTemplateConfig {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE_CONFIG;
  try {
    const raw = localStorage.getItem(TEMPLATE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_TEMPLATE_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Error al leer configuración de plantilla local:', e);
  }
  return DEFAULT_TEMPLATE_CONFIG;
}

export function saveStoredTemplateConfig(config: SheetTemplateConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('template-config-updated', { detail: config }));
  } catch (e) {
    console.warn('Error al guardar configuración de plantilla local:', e);
  }
}

export function resetStoredTemplateConfig(): SheetTemplateConfig {
  saveStoredTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
  return DEFAULT_TEMPLATE_CONFIG;
}

// ==================== MAPEO A BASE DE DATOS ====================

/**
 * Convierte un objeto SheetTemplateConfig a un registro relacional para Supabase
 */
export function mapConfigToDatabaseRecord(config: SheetTemplateConfig) {
  return {
    id: OFFICIAL_TEMPLATE_RECORD_ID,
    template_name: 'Formato Oficial Maquila CV Directo',
    is_active: true,
    version: config.version || '00',
    document_code: config.documentCode || 'CVD-CCA-F-08',
    revision_date: config.revisionDate || '2026-08-03',
    report_title: config.reportTitle || 'INFORME DE INSPECCIÓN MAQUILA',
    header_subtitle: config.headerSubtitle || 'Formato de Trabajo Normativo',
    procedure_reference: config.procedureReference || 'Procedimiento CVD-AMA-PR-01 • Gestión e Intervención de Productos',
    logo_type: config.logoType || 'image',
    logo_image_url: config.logoImageUrl || '',
    logo_accent_color: config.logoAccentColor || '#1A1A1A',
    logo_height: config.logoHeight || 48,
    logo_text_primary: config.logoTextPrimary || '',
    logo_text_secondary: config.logoTextSecondary || '',
    logo_subtitle: config.logoSubtitle || '',
    section1_title: config.section1Title,
    section2_title: config.section2Title,
    section3_title: config.section3Title,
    section4_title: config.section4Title,
    section5_title: config.section5Title,
    section6_title: config.section6Title,
    section7_title: config.section7Title,
    font_family_general: config.fontFamilyGeneral,
    font_family_titles: config.fontFamilyTitles,
    font_size_report_title: config.fontSizeReportTitle,
    font_size_header_subtitle: config.fontSizeHeaderSubtitle,
    font_size_procedure_ref: config.fontSizeProcedureRef,
    font_size_section_titles: config.fontSizeSectionTitles,
    font_size_cell_labels: config.fontSizeCellLabels,
    font_size_cell_values: config.fontSizeCellValues,
    font_size_metadata_labels: config.fontSizeMetadataLabels,
    font_size_metadata_values: config.fontSizeMetadataValues,
    font_size_table_headers: config.fontSizeTableHeaders,
    font_size_footer_note: config.fontSizeFooterNote || 9,
    title_text_color: config.titleTextColor,
    subtitle_text_color: config.subtitleTextColor,
    procedure_ref_text_color: config.procedureRefTextColor,
    section_header_text_color: config.sectionHeaderTextColor,
    cell_label_text_color: config.cellLabelTextColor,
    cell_value_text_color: config.cellValueTextColor,
    metadata_label_text_color: config.metadataLabelTextColor,
    metadata_value_text_color: config.metadataValueTextColor,
    table_sub_header_text_color: config.tableSubHeaderTextColor,
    section_header_bg_color: config.sectionHeaderBgColor,
    cell_label_bg_color: config.cellLabelBgColor,
    table_border_color: config.tableBorderColor,
    table_sub_header_bg_color: config.tableSubHeaderBgColor,
    metadata_bg_color: config.metadataBgColor,
    raw_config: config,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convierte un registro de Supabase a un objeto SheetTemplateConfig
 */
export function mapDatabaseRecordToConfig(record: any): SheetTemplateConfig {
  if (!record) return DEFAULT_TEMPLATE_CONFIG;

  // Si tiene el objeto completo serializado en raw_config, es la fuente más fiel
  if (record.raw_config && typeof record.raw_config === 'object') {
    return {
      ...DEFAULT_TEMPLATE_CONFIG,
      ...record.raw_config,
    };
  }

  // Mapeo campo por campo desde columnas individuales
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    logoType: record.logo_type || DEFAULT_TEMPLATE_CONFIG.logoType,
    logoImageUrl: record.logo_image_url || '',
    logoAccentColor: record.logo_accent_color || DEFAULT_TEMPLATE_CONFIG.logoAccentColor,
    logoHeight: record.logo_height || DEFAULT_TEMPLATE_CONFIG.logoHeight,
    logoTextPrimary: record.logo_text_primary || '',
    logoTextSecondary: record.logo_text_secondary || '',
    logoSubtitle: record.logo_subtitle || '',
    headerSubtitle: record.header_subtitle || DEFAULT_TEMPLATE_CONFIG.headerSubtitle,
    reportTitle: record.report_title || DEFAULT_TEMPLATE_CONFIG.reportTitle,
    procedureReference: record.procedure_reference || DEFAULT_TEMPLATE_CONFIG.procedureReference,
    documentCode: record.document_code || DEFAULT_TEMPLATE_CONFIG.documentCode,
    version: record.version || DEFAULT_TEMPLATE_CONFIG.version,
    revisionDate: record.revision_date || DEFAULT_TEMPLATE_CONFIG.revisionDate,
    section1Title: record.section1_title || DEFAULT_TEMPLATE_CONFIG.section1Title,
    section2Title: record.section2_title || DEFAULT_TEMPLATE_CONFIG.section2Title,
    section3Title: record.section3_title || DEFAULT_TEMPLATE_CONFIG.section3Title,
    section4Title: record.section4_title || DEFAULT_TEMPLATE_CONFIG.section4Title,
    section5Title: record.section5_title || DEFAULT_TEMPLATE_CONFIG.section5Title,
    section6Title: record.section6_title || DEFAULT_TEMPLATE_CONFIG.section6Title,
    section7Title: record.section7_title || DEFAULT_TEMPLATE_CONFIG.section7Title,
    fontFamilyGeneral: record.font_family_general || DEFAULT_TEMPLATE_CONFIG.fontFamilyGeneral,
    fontFamilyTitles: record.font_family_titles || DEFAULT_TEMPLATE_CONFIG.fontFamilyTitles,
    fontSizeReportTitle: record.font_size_report_title || DEFAULT_TEMPLATE_CONFIG.fontSizeReportTitle,
    fontSizeHeaderSubtitle: record.font_size_header_subtitle || DEFAULT_TEMPLATE_CONFIG.fontSizeHeaderSubtitle,
    fontSizeProcedureRef: record.font_size_procedure_ref || DEFAULT_TEMPLATE_CONFIG.fontSizeProcedureRef,
    fontSizeSectionTitles: record.font_size_section_titles || DEFAULT_TEMPLATE_CONFIG.fontSizeSectionTitles,
    fontSizeCellLabels: record.font_size_cell_labels || DEFAULT_TEMPLATE_CONFIG.fontSizeCellLabels,
    fontSizeCellValues: record.font_size_cell_values || DEFAULT_TEMPLATE_CONFIG.fontSizeCellValues,
    fontSizeMetadataLabels: record.font_size_metadata_labels || DEFAULT_TEMPLATE_CONFIG.fontSizeMetadataLabels,
    fontSizeMetadataValues: record.font_size_metadata_values || DEFAULT_TEMPLATE_CONFIG.fontSizeMetadataValues,
    fontSizeTableHeaders: record.font_size_table_headers || DEFAULT_TEMPLATE_CONFIG.fontSizeTableHeaders,
    fontSizeFooterNote: record.font_size_footer_note || DEFAULT_TEMPLATE_CONFIG.fontSizeFooterNote,
    titleTextColor: record.title_text_color || DEFAULT_TEMPLATE_CONFIG.titleTextColor,
    subtitleTextColor: record.subtitle_text_color || DEFAULT_TEMPLATE_CONFIG.subtitleTextColor,
    procedureRefTextColor: record.procedure_ref_text_color || DEFAULT_TEMPLATE_CONFIG.procedureRefTextColor,
    sectionHeaderTextColor: record.section_header_text_color || DEFAULT_TEMPLATE_CONFIG.sectionHeaderTextColor,
    cellLabelTextColor: record.cell_label_text_color || DEFAULT_TEMPLATE_CONFIG.cellLabelTextColor,
    cellValueTextColor: record.cell_value_text_color || DEFAULT_TEMPLATE_CONFIG.cellValueTextColor,
    metadataLabelTextColor: record.metadata_label_text_color || DEFAULT_TEMPLATE_CONFIG.metadataLabelTextColor,
    metadataValueTextColor: record.metadata_value_text_color || DEFAULT_TEMPLATE_CONFIG.metadataValueTextColor,
    tableSubHeaderTextColor: record.table_sub_header_text_color || DEFAULT_TEMPLATE_CONFIG.tableSubHeaderTextColor,
    sectionHeaderBgColor: record.section_header_bg_color || DEFAULT_TEMPLATE_CONFIG.sectionHeaderBgColor,
    cellLabelBgColor: record.cell_label_bg_color || DEFAULT_TEMPLATE_CONFIG.cellLabelBgColor,
    tableBorderColor: record.table_border_color || DEFAULT_TEMPLATE_CONFIG.tableBorderColor,
    tableSubHeaderBgColor: record.table_sub_header_bg_color || DEFAULT_TEMPLATE_CONFIG.tableSubHeaderBgColor,
    metadataBgColor: record.metadata_bg_color || DEFAULT_TEMPLATE_CONFIG.metadataBgColor,
  };
}

// ==================== SINCRONIZACIÓN CON SUPABASE ====================

/**
 * Consulta la configuración oficial desde Supabase. Si existe, la actualiza localmente.
 * Si no existe, siembra los valores iniciales en la tabla.
 */
export async function syncTemplateConfigFromSupabase(): Promise<{ data: SheetTemplateConfig; fromCloud: boolean }> {
  try {
    const res = await proxyDbGet<any>('official_template_config', {
      filters: [{ column: 'id', op: 'eq', value: OFFICIAL_TEMPLATE_RECORD_ID }],
      limit: 1,
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const cloudConfig = mapDatabaseRecordToConfig(res.data[0]);
      saveStoredTemplateConfig(cloudConfig);
      return { data: cloudConfig, fromCloud: true };
    } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
      // Si la tabla existe pero está vacía, insertamos la configuración predeterminada
      await seedDefaultTemplateConfigToSupabase();
    }
  } catch (err) {
    console.warn('Supabase sync template config fallback:', err);
  }

  return { data: getStoredTemplateConfig(), fromCloud: false };
}

/**
 * Guarda o actualiza la configuración del formato oficial en Supabase (upsert)
 */
export async function saveTemplateConfigToSupabase(
  config: SheetTemplateConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const record = mapConfigToDatabaseRecord(config);
    const res = await proxyDbPost('official_template_config', record, true);

    if (res.error) {
      console.warn('Error saving template config to Supabase:', res.error);
      return { success: false, error: res.error };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Excepción guardando template config en Supabase:', err);
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

/**
 * Inserta la configuración inicial oficial en Supabase
 */
export async function seedDefaultTemplateConfigToSupabase(): Promise<void> {
  try {
    const record = mapConfigToDatabaseRecord(DEFAULT_TEMPLATE_CONFIG);
    await proxyDbPost('official_template_config', record, true);
  } catch (err) {
    console.warn('Error sembrando template config inicial en Supabase:', err);
  }
}

/**
 * Consulta la lista de presets de colores desde Supabase
 */
export async function fetchPresetsFromSupabase(): Promise<{ data: TemplatePresetRecord[]; fromCloud: boolean }> {
  try {
    const res = await proxyDbGet<any>('official_template_presets', {
      order: { column: 'display_order', ascending: true },
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const presets: TemplatePresetRecord[] = res.data.map((row) => ({
        id: row.id,
        name: row.name,
        sectionHeaderBg: row.section_header_bg,
        sectionHeaderText: row.section_header_text,
        border: row.border_color,
        cellLabelBg: row.cell_label_bg,
        cellLabelText: row.cell_label_text,
        cellValueText: row.cell_value_text,
        titleText: row.title_text,
        metaBg: row.meta_bg,
        displayOrder: row.display_order,
        isSystem: row.is_system,
      }));
      return { data: presets, fromCloud: true };
    } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
      await seedDefaultPresetsToSupabase();
    }
  } catch (err) {
    console.warn('Supabase sync presets fallback:', err);
  }

  return { data: SYSTEM_PRESETS, fromCloud: false };
}

/**
 * Siembra los 6 preajustes de color del sistema en Supabase
 */
export async function seedDefaultPresetsToSupabase(): Promise<void> {
  try {
    const records = SYSTEM_PRESETS.map((preset) => ({
      id: preset.id,
      name: preset.name,
      section_header_bg: preset.sectionHeaderBg,
      section_header_text: preset.sectionHeaderText,
      border_color: preset.border,
      cell_label_bg: preset.cellLabelBg,
      cell_label_text: preset.cellLabelText,
      cell_value_text: preset.cellValueText,
      title_text: preset.titleText,
      meta_bg: preset.metaBg,
      display_order: preset.displayOrder || 0,
      is_system: true,
    }));

    await proxyDbPost('official_template_presets', records, true);
  } catch (err) {
    console.warn('Error sembrando presets en Supabase:', err);
  }
}
