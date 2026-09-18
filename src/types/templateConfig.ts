export interface SheetTemplateConfig {
  // Logo
  logoType: 'text' | 'image';
  logoTextPrimary: string;
  logoTextSecondary: string;
  logoSubtitle: string;
  logoImageUrl?: string; // base64 or url
  logoAccentColor: string;
  logoHeight?: number; // px (e.g. 30 to 90px, default: 46)

  // Document Metadata & Header Texts
  headerSubtitle: string; // e.g. "Formato de Trabajo Normativo"
  reportTitle: string; // e.g. "INFORME DE INSPECCIÓN MAQUILA"
  procedureReference: string; // e.g. "Procedimiento CVD-AMA-PR-01 • Gestión e Intervención de Productos"
  documentCode: string; // e.g. "CVD-CCA-F-08"
  version: string; // e.g. "00"
  revisionDate: string; // e.g. "2026-08-03"

  // Section Titles (I to VII)
  section1Title: string;
  section2Title: string;
  section3Title: string;
  section4Title: string;
  section5Title: string;
  section6Title: string;
  section7Title: string;

  // Alignments (tipo Word)
  alignReportTitle: 'left' | 'center' | 'right';
  alignHeaderSubtitle: 'left' | 'center' | 'right';
  alignProcedureRef: 'left' | 'center' | 'right';
  alignSectionTitles: 'left' | 'center' | 'right';
  alignTableHeaders: 'left' | 'center' | 'right';

  // Spacing, Padding & Anti-Clipping (Word-like Layout Engine)
  cellPaddingVertical: number; // e.g. 6 (range 3 - 14)
  cellPaddingHorizontal: number; // e.g. 8 (range 4 - 16)
  lineHeightMultiplier: number; // e.g. 1.40 (range 1.15 - 1.80)
  tableBorderWidth: number; // e.g. 2 (range 1 - 4)

  // Typography / Font Families
  fontFamilyGeneral: 'sans' | 'serif' | 'mono' | 'arial' | 'georgia' | 'trebuchet';
  fontFamilyTitles: 'serif' | 'sans' | 'mono' | 'georgia' | 'arial';

  // Individual Text Sizes (in px)
  fontSizeReportTitle: number; // e.g. 18 (range 13 - 32)
  fontSizeHeaderSubtitle: number; // e.g. 9 (range 7 - 14)
  fontSizeProcedureRef: number; // e.g. 9 (range 7 - 14)
  fontSizeSectionTitles: number; // e.g. 13 (range 10 - 20)
  fontSizeCellLabels: number; // e.g. 10 (range 8 - 14)
  fontSizeCellValues: number; // e.g. 12 (range 9 - 16)
  fontSizeMetadataLabels: number; // e.g. 9 (range 7 - 13)
  fontSizeMetadataValues: number; // e.g. 10 (range 8 - 14)
  fontSizeTableHeaders: number; // e.g. 10 (range 8 - 13)
  fontSizeFooterNote?: number; // e.g. 9 (range 7 - 12)

  // Individual Text Colors
  titleTextColor: string; // Color del título principal
  subtitleTextColor: string; // Color del subtítulo superior
  procedureRefTextColor: string; // Color de la referencia de procedimiento
  sectionHeaderTextColor: string; // Color del texto de barras de sección
  cellLabelTextColor: string; // Color del texto de etiquetas de campo
  cellValueTextColor: string; // Color del texto de datos y valores
  metadataLabelTextColor: string; // Color de etiquetas del bloque metadatos
  metadataValueTextColor: string; // Color de valores del bloque metadatos
  tableSubHeaderTextColor: string; // Color de encabezados de tablas secundarias

  // Backgrounds & Borders
  sectionHeaderBgColor: string; // Fondo de barras de sección (default: #1A1A1A)
  cellLabelBgColor: string; // Fondo de etiquetas de celdas (default: #F3F4F6)
  tableBorderColor: string; // Color de bordes y líneas (default: #1A1A1A)
  tableSubHeaderBgColor: string; // Fondo de cabeceras secundarias (default: #F3F4F6)
  metadataBgColor: string; // Fondo del bloque superior de metadatos (default: #FAF9F6)

  // Legacy / Fallback Aliases
  headerBgColor?: string;
  headerTextColor?: string;
  cellHeaderBgColor?: string;
  cellHeaderTextColor?: string;
}

export const DEFAULT_TEMPLATE_CONFIG: SheetTemplateConfig = {
  // Logo: sin logo por defecto, listo para subir imagen limpia
  logoType: 'image',
  logoTextPrimary: '',
  logoTextSecondary: '',
  logoSubtitle: '',
  logoImageUrl: '', // vacío por defecto para que suban su propia imagen
  logoAccentColor: '#1A1A1A',
  logoHeight: 48,

  // Metadata
  headerSubtitle: 'Formato de Trabajo Normativo',
  reportTitle: 'INFORME DE INSPECCIÓN MAQUILA',
  procedureReference: 'Procedimiento CVD-AMA-PR-01 • Gestión e Intervención de Productos',
  documentCode: 'CVD-CCA-F-08',
  version: '00',
  revisionDate: '2026-08-03',

  // Section Titles
  section1Title: 'I. Datos Generales de Inspección',
  section2Title: 'II. Control del Producto y Combo de Armado',
  section3Title: 'III. Muestreo de Aceptación (AQL ANSI/ASQ Z1.4)',
  section4Title: 'IV. Clasificación de Defectos Físicos y Funcionales',
  section5Title: 'V. Registro de Evidencias Fotográficas Normativas',
  section6Title: 'VI. Dictamen Final y Disposición del Lote',
  section7Title: 'VII. Firmas de Conformidad y Aprobación',

  // Alignments (tipo Word)
  alignReportTitle: 'center',
  alignHeaderSubtitle: 'center',
  alignProcedureRef: 'center',
  alignSectionTitles: 'left',
  alignTableHeaders: 'center',

  // Spacing & Anti-Clipping Defaults
  cellPaddingVertical: 6,
  cellPaddingHorizontal: 8,
  lineHeightMultiplier: 1.4,
  tableBorderWidth: 2,

  // Typography
  fontFamilyGeneral: 'sans',
  fontFamilyTitles: 'sans',

  // Font Sizes (px)
  fontSizeReportTitle: 18,
  fontSizeHeaderSubtitle: 9,
  fontSizeProcedureRef: 9,
  fontSizeSectionTitles: 13,
  fontSizeCellLabels: 10,
  fontSizeCellValues: 12,
  fontSizeMetadataLabels: 9,
  fontSizeMetadataValues: 10,
  fontSizeTableHeaders: 10,
  fontSizeFooterNote: 9,

  // Individual Text Colors
  titleTextColor: '#111827',
  subtitleTextColor: '#6B7280',
  procedureRefTextColor: '#4B5563',
  sectionHeaderTextColor: '#FFFFFF',
  cellLabelTextColor: '#1F2937',
  cellValueTextColor: '#111827',
  metadataLabelTextColor: '#374151',
  metadataValueTextColor: '#111827',
  tableSubHeaderTextColor: '#374151',

  // Backgrounds & Borders
  sectionHeaderBgColor: '#1D4ED8',
  cellLabelBgColor: '#F3F4F6',
  tableBorderColor: '#1E3A8A',
  tableSubHeaderBgColor: '#F3F4F6',
  metadataBgColor: '#FAF9F6',

  // Fallbacks
  headerBgColor: '#1D4ED8',
  headerTextColor: '#FFFFFF',
  cellHeaderBgColor: '#F3F4F6',
  cellHeaderTextColor: '#1F2937',
};
