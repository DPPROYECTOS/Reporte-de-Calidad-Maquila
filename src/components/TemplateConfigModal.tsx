import React, { useState, useEffect } from 'react';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import {
  X,
  Sliders,
  RotateCcw,
  Save,
  Check,
  Palette,
  Type,
  Image as ImageIcon,
  FileText,
  Upload,
  Eye,
  Trash2,
  SlidersHorizontal,
  Paintbrush,
  ListOrdered,
  Database,
  Cloud,
  CloudCheck,
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  saveTemplateConfigToSupabase,
  syncTemplateConfigFromSupabase,
  saveStoredTemplateConfig,
  resetStoredTemplateConfig,
  fetchPresetsFromSupabase,
  TemplatePresetRecord,
} from '../utils/templateConfigStore';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetTemplateConfig;
  onSaveConfig: (newConfig: SheetTemplateConfig) => void;
  onOpenCatalogUpload?: () => void;
}

const COLOR_PRESETS = [
  {
    name: 'Industrial Negro (Clásico)',
    sectionHeaderBg: '#1A1A1A',
    sectionHeaderText: '#FFFFFF',
    border: '#1A1A1A',
    cellLabelBg: '#F3F4F6',
    cellLabelText: '#1F2937',
    cellValueText: '#111827',
    titleText: '#111827',
    metaBg: '#FAF9F6',
  },
  {
    name: 'Azul Marino Corporativo',
    sectionHeaderBg: '#0F172A',
    sectionHeaderText: '#FFFFFF',
    border: '#1E293B',
    cellLabelBg: '#F1F5F9',
    cellLabelText: '#0F172A',
    cellValueText: '#0F172A',
    titleText: '#0F172A',
    metaBg: '#F8FAFC',
  },
  {
    name: 'Verde Calidad ISO',
    sectionHeaderBg: '#064E3B',
    sectionHeaderText: '#FFFFFF',
    border: '#064E3B',
    cellLabelBg: '#ECFDF5',
    cellLabelText: '#064E3B',
    cellValueText: '#064E3B',
    titleText: '#064E3B',
    metaBg: '#F0FDF4',
  },
  {
    name: 'Azul Cobalto Operaciones',
    sectionHeaderBg: '#1E3A8A',
    sectionHeaderText: '#FFFFFF',
    border: '#1E3A8A',
    cellLabelBg: '#EFF6FF',
    cellLabelText: '#1E3A8A',
    cellValueText: '#1E3A8A',
    titleText: '#1E3A8A',
    metaBg: '#F8FAFC',
  },
  {
    name: 'Grafito Minimalista',
    sectionHeaderBg: '#374151',
    sectionHeaderText: '#FFFFFF',
    border: '#4B5563',
    cellLabelBg: '#F3F4F6',
    cellLabelText: '#111827',
    cellValueText: '#111827',
    titleText: '#111827',
    metaBg: '#F9FAFB',
  },
  {
    name: 'Tinto Ejecutivo',
    sectionHeaderBg: '#881337',
    sectionHeaderText: '#FFFFFF',
    border: '#881337',
    cellLabelBg: '#FFF1F2',
    cellLabelText: '#4C0519',
    cellValueText: '#4C0519',
    titleText: '#4C0519',
    metaBg: '#FFF5F5',
  },
];

const FONT_OPTIONS: { id: SheetTemplateConfig['fontFamilyGeneral']; name: string; sample: string; css: string }[] = [
  {
    id: 'sans',
    name: 'Sans-Serif Moderna (Inter / Roboto / Sistema)',
    sample: 'Control de Calidad 123',
    css: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: 'serif',
    name: 'Serif Formal y Ejecutiva (Georgia / Times New Roman)',
    sample: 'Control de Calidad 123',
    css: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'mono',
    name: 'Monospace Técnica y Precisa (Courier / Consolas)',
    sample: 'Control de Calidad 123',
    css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  {
    id: 'arial',
    name: 'Arial Clásica Limpia',
    sample: 'Control de Calidad 123',
    css: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  },
  {
    id: 'georgia',
    name: 'Georgia Editorial',
    sample: 'Control de Calidad 123',
    css: 'Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS Geométrica',
    sample: 'Control de Calidad 123',
    css: '"Trebuchet MS", "Lucida Sans Unicode", Arial, sans-serif',
  },
];

export const TemplateConfigModal: React.FC<TemplateConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenCatalogUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'logo' | 'typography' | 'sizes' | 'textColors' | 'boxColors' | 'titles' | 'sections'>('logo');
  const [form, setForm] = useState<SheetTemplateConfig>(() => ({ ...DEFAULT_TEMPLATE_CONFIG, ...config }));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'local' | 'saving'>('synced');
  const [customPresets, setCustomPresets] = useState<TemplatePresetRecord[]>([]);

  // Modal de confirmación para eliminar o restablecer
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemType?: string;
    itemName?: string;
    message?: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '¿Confirmar acción?',
    onConfirm: () => {},
  });

  // Sync state and fetch from Supabase when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULT_TEMPLATE_CONFIG, ...config });
      setSavedSuccess(false);

      // Cargar configuración y presets desde Supabase en segundo plano
      syncTemplateConfigFromSupabase().then((res) => {
        if (res.fromCloud && res.data) {
          setForm(res.data);
          setCloudStatus('synced');
        } else {
          setCloudStatus('local');
        }
      });

      fetchPresetsFromSupabase().then((res) => {
        if (res.data && res.data.length > 0) {
          setCustomPresets(res.data);
        }
      });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof SheetTemplateConfig>(key: K, value: SheetTemplateConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const processImageFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoImageUrl', reader.result);
        handleChange('logoType', 'image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0] | TemplatePresetRecord) => {
    setForm((prev) => ({
      ...prev,
      sectionHeaderBgColor: preset.sectionHeaderBg,
      sectionHeaderTextColor: preset.sectionHeaderText,
      headerBgColor: preset.sectionHeaderBg,
      headerTextColor: preset.sectionHeaderText,
      tableBorderColor: preset.border,
      cellLabelBgColor: preset.cellLabelBg,
      cellLabelTextColor: preset.cellLabelText,
      cellHeaderBgColor: preset.cellLabelBg,
      cellHeaderTextColor: preset.cellLabelText,
      cellValueTextColor: preset.cellValueText,
      titleTextColor: preset.titleText,
      metadataBgColor: preset.metaBg,
    }));
  };

  const handleResetToDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Restablecer formato a valores oficiales?',
      itemType: 'Configuración Oficial',
      itemName: 'Formato CVD-CCA-F-08',
      message: '¿Estás seguro de restablecer todos los textos, colores, tamaños, tipografías y logo a los valores originales de fábrica? También se sincronizará con la base de datos de Supabase.',
      confirmText: 'Sí, restablecer valores',
      onConfirm: async () => {
        setForm(DEFAULT_TEMPLATE_CONFIG);
        onSaveConfig(DEFAULT_TEMPLATE_CONFIG);
        saveStoredTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
        setCloudStatus('saving');
        await saveTemplateConfigToSupabase(DEFAULT_TEMPLATE_CONFIG);
        setCloudStatus('synced');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      },
    });
  };

  const handleSave = async () => {
    // 1. Guardar localmente
    onSaveConfig(form);
    saveStoredTemplateConfig(form);

    // 2. Guardar en Supabase en la tabla official_template_config
    setCloudStatus('saving');
    try {
      const res = await saveTemplateConfigToSupabase(form);
      if (res.success) {
        setCloudStatus('synced');
      } else {
        setCloudStatus('local');
      }
    } catch (e) {
      console.warn('Error guardando en Supabase:', e);
      setCloudStatus('local');
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  // Helper font family css
  const activeGeneralFontCss = FONT_OPTIONS.find((f) => f.id === form.fontFamilyGeneral)?.css || 'sans-serif';
  const activeTitleFontCss = FONT_OPTIONS.find((f) => f.id === form.fontFamilyTitles)?.css || 'serif';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-700 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        {/* Header del Modal */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Editor del Formato Oficial
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Personalización Completa
                </span>
                {cloudStatus === 'synced' && (
                  <span className="hidden md:inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[9px] px-2 py-0.5 rounded-full font-bold">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Supabase DB Conectado</span>
                  </span>
                )}
                {cloudStatus === 'saving' && (
                  <span className="hidden md:inline-flex items-center space-x-1 bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                    <Cloud className="w-3 h-3 text-amber-400" />
                    <span>Guardando en Supabase...</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Ajusta logo en imagen, tamaño de cada texto, colores individuales de letra, tipografía y recuadros.
              </p>
            </div>
          </div>
            <div className="flex items-center space-x-2">
              {onOpenCatalogUpload && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCatalogUpload();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                  title="Abrir la ventana de carga de claves de armados y componentes (Excel / CSV)"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Catálogo Armados (Excel/CSV)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
        </div>

        {/* VISTA PREVIA EN VIVO */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vista Previa en Tiempo Real:</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">
              Tipografía: {form.fontFamilyGeneral} | Títulos: {form.fontFamilyTitles}
            </span>
          </div>

          <div
            className="bg-white rounded-lg p-2.5 shadow-sm transition-all"
            style={{
              border: `2px solid ${form.tableBorderColor}`,
              fontFamily: activeGeneralFontCss,
            }}
          >
            <div
              className="grid grid-cols-12 divide-x text-center items-center"
              style={{ borderColor: form.tableBorderColor }}
            >
              {/* Logo Preview */}
              <div className="col-span-3 p-2 flex flex-col items-center justify-center min-h-[55px] bg-white">
                {form.logoImageUrl ? (
                  <img
                    src={form.logoImageUrl}
                    alt="Logo Empresa"
                    style={{ maxHeight: `${Math.min(form.logoHeight || 48, 55)}px` }}
                    className="max-w-full object-contain"
                  />
                ) : (
                  <div className="text-[10px] font-mono font-bold text-slate-400 border border-dashed border-slate-300 rounded p-1.5 w-full text-center">
                    [Sin Logo Subido]
                  </div>
                )}
                {form.logoSubtitle && (
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider mt-1"
                    style={{ color: form.subtitleTextColor }}
                  >
                    {form.logoSubtitle}
                  </span>
                )}
              </div>

              {/* Title Preview */}
              <div
                className="col-span-6 p-2 flex flex-col justify-center text-center"
                style={{ backgroundColor: form.metadataBgColor }}
              >
                <span
                  className="font-bold uppercase tracking-widest truncate"
                  style={{
                    fontSize: `${form.fontSizeHeaderSubtitle}px`,
                    color: form.subtitleTextColor,
                  }}
                >
                  {form.headerSubtitle}
                </span>
                <h4
                  className="font-black uppercase tracking-tight truncate leading-tight my-0.5"
                  style={{
                    fontSize: `${form.fontSizeReportTitle}px`,
                    color: form.titleTextColor,
                    fontFamily: activeTitleFontCss,
                  }}
                >
                  {form.reportTitle}
                </h4>
                <span
                  className="italic truncate"
                  style={{
                    fontSize: `${form.fontSizeProcedureRef}px`,
                    color: form.procedureRefTextColor,
                  }}
                >
                  {form.procedureReference}
                </span>
              </div>

              {/* Metadata Preview */}
              <div
                className="col-span-3 font-mono p-1.5 flex flex-col justify-center text-left"
                style={{
                  backgroundColor: form.metadataBgColor,
                  fontSize: `${form.fontSizeMetadataLabels}px`,
                }}
              >
                <div>
                  <strong style={{ color: form.metadataLabelTextColor }}>CÓDIGO: </strong>
                  <span style={{ color: form.metadataValueTextColor, fontSize: `${form.fontSizeMetadataValues}px` }}>
                    {form.documentCode}
                  </span>
                </div>
                <div>
                  <strong style={{ color: form.metadataLabelTextColor }}>VERSIÓN: </strong>
                  <span style={{ color: form.metadataValueTextColor, fontSize: `${form.fontSizeMetadataValues}px` }}>
                    {form.version}
                  </span>
                </div>
                <div>
                  <strong style={{ color: form.metadataLabelTextColor }}>REVISIÓN: </strong>
                  <span style={{ color: form.metadataValueTextColor, fontSize: `${form.fontSizeMetadataValues}px` }}>
                    {form.revisionDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Sección Preview */}
            <div
              className="mt-2 font-bold px-3 py-1 uppercase tracking-wider flex items-center justify-between rounded"
              style={{
                backgroundColor: form.sectionHeaderBgColor || form.headerBgColor,
                color: form.sectionHeaderTextColor || form.headerTextColor,
                fontSize: `${form.fontSizeSectionTitles}px`,
                fontFamily: activeTitleFontCss,
              }}
            >
              <span>{form.section1Title}</span>
              <span className="opacity-80 text-[8px] font-mono">{form.documentCode}</span>
            </div>

            {/* Muestra de Celda Preview */}
            <div
              className="mt-1.5 grid grid-cols-4 border text-left divide-x"
              style={{ borderColor: form.tableBorderColor }}
            >
              <div
                className="p-1 font-bold uppercase"
                style={{
                  backgroundColor: form.cellLabelBgColor,
                  color: form.cellLabelTextColor,
                  fontSize: `${form.fontSizeCellLabels}px`,
                }}
              >
                Inspector:
              </div>
              <div
                className="p-1 font-semibold"
                style={{
                  color: form.cellValueTextColor,
                  fontSize: `${form.fontSizeCellValues}px`,
                }}
              >
                Lic. Laura Martínez
              </div>
              <div
                className="p-1 font-bold uppercase"
                style={{
                  backgroundColor: form.cellLabelBgColor,
                  color: form.cellLabelTextColor,
                  fontSize: `${form.fontSizeCellLabels}px`,
                }}
              >
                Fecha Inspección:
              </div>
              <div
                className="p-1 font-mono"
                style={{
                  color: form.cellValueTextColor,
                  fontSize: `${form.fontSizeCellValues}px`,
                }}
              >
                08/09/2026
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Pestañas de Edición */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-2 sm:px-4 shrink-0 overflow-x-auto text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'logo'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <span>1. Subir Logo / Imagen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'typography'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4 text-indigo-600" />
            <span>2. Tipo de Letra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sizes')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sizes'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>3. Tamaño de Cada Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('textColors')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'textColors'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paintbrush className="w-4 h-4 text-indigo-600" />
            <span>4. Color de Cada Letra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('boxColors')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'boxColors'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>5. Colores de Recuadros</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('titles')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'titles'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>6. Títulos de Hoja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sections'
                ? 'border-indigo-600 text-indigo-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4 text-indigo-600" />
            <span>7. Títulos Secciones (I-VII)</span>
          </button>
        </div>

        {/* Contenido de las Pestañas (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* ========================================================
              TAB 1: SUBIR LOGO E IMAGEN (ELIMINADO LOGO POR DEFECTO)
             ======================================================== */}
          {activeTab === 'logo' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-950">
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Logotipo Institucional de la Hoja Oficial</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Se ha retirado el logo anterior. Ahora puedes subir la imagen o logotipo oficial de tu empresa en formato PNG, JPG o SVG. Esta imagen aparecerá en el encabezado oficial de la hoja de inspección e informes impresos.
                </p>
              </div>

              {/* Zona de Carga Drag & Drop / Input File */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragOver
                    ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                    : form.logoImageUrl
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-slate-400 bg-white hover:border-indigo-500'
                }`}
              >
                {form.logoImageUrl ? (
                  <div className="space-y-3">
                    <div className="flex justify-center items-center py-2">
                      <img
                        src={form.logoImageUrl}
                        alt="Logo Actual"
                        style={{ maxHeight: `${form.logoHeight || 48}px` }}
                        className="max-w-[280px] object-contain shadow-xs border border-slate-200 p-2 bg-white rounded-xl"
                      />
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs inline-flex items-center space-x-1.5 transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cambiar Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: '¿Estás seguro de quitar el logotipo oficial?',
                            itemType: 'Logotipo Institucional',
                            itemName: 'Imagen de cabecera del formato',
                            message: 'Esta acción removerá la imagen del logotipo en el encabezado oficial de la hoja de trabajo e informes impresos.',
                            confirmText: 'Sí, quitar logo',
                            onConfirm: () => handleChange('logoImageUrl', ''),
                          });
                        }}
                        className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 font-bold px-3 py-1.5 rounded-xl border border-red-200 inline-flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Logo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        Arrastra tu imagen aquí o haz clic para seleccionarla
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Formatos soportados: PNG (con o sin transparencia), JPG, SVG o WebP
                      </p>
                    </div>
                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl shadow-md inline-flex items-center space-x-2 transition">
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar Archivo de mi Equipo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Ajuste de Altura del Logo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>Altura de visualización del logo en la hoja:</span>
                  </label>
                  <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-lg border text-indigo-700">
                    {form.logoHeight || 48} px
                  </span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={90}
                  step={2}
                  value={form.logoHeight || 48}
                  onChange={(e) => handleChange('logoHeight', parseInt(e.target.value) || 48)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Pequeño (24px)</span>
                  <span>Estándar (48px)</span>
                  <span>Grande (90px)</span>
                </div>
              </div>

              {/* URL directa opcional */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  O ingresar enlace URL directo de la imagen:
                </label>
                <input
                  type="text"
                  value={form.logoImageUrl || ''}
                  onChange={(e) => {
                    handleChange('logoImageUrl', e.target.value);
                    handleChange('logoType', 'image');
                  }}
                  placeholder="https://ejemplo.com/logo-empresa.png"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Subtítulo del Logo opcional */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Texto o Subtítulo bajo el Logo (Opcional):
                </label>
                <input
                  type="text"
                  value={form.logoSubtitle}
                  onChange={(e) => handleChange('logoSubtitle', e.target.value)}
                  placeholder="Control de Calidad / Aseguramiento de Calidad"
                  className="w-full font-bold px-3 py-2 border border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Puedes dejarlo en blanco si tu imagen de logotipo ya incluye el nombre o departamento.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: TIPO DE LETRA (TIPOGRAFÍA)
             ======================================================== */}
          {activeTab === 'typography' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-950">
                <p className="font-bold text-[11px] mb-0.5 flex items-center space-x-1.5">
                  <Type className="w-4 h-4 text-indigo-600" />
                  <span>Familias Tipográficas del Documento:</span>
                </p>
                <p className="text-[11px] text-indigo-800">
                  Selecciona la tipografía principal del documento y la tipografía para los títulos de sección y encabezados.
                </p>
              </div>

              {/* Tipografía General */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800 text-xs">
                  Tipo de Letra Principal del Documento (Tablas, Etiquetas, Datos):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleChange('fontFamilyGeneral', f.id)}
                      className={`text-left p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        form.fontFamilyGeneral === f.id
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{f.name}</span>
                        {form.fontFamilyGeneral === f.id && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div
                        className="text-xs text-slate-600 mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100"
                        style={{ fontFamily: f.css }}
                      >
                        ABCDEF abcdef 0123456789 (Muestra)
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipografía de Títulos */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <label className="block font-bold text-slate-800 text-xs">
                  Tipo de Letra para Títulos Principales y Barras de Sección:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'serif' as const, name: 'Serif Formal / Editorial', font: 'ui-serif, Georgia, serif' },
                    { id: 'sans' as const, name: 'Sans-Serif Moderna / Limpia', font: 'ui-sans-serif, system-ui, sans-serif' },
                    { id: 'mono' as const, name: 'Monospace Técnica Industrial', font: 'ui-monospace, monospace' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleChange('fontFamilyTitles', t.id)}
                      className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${
                        form.fontFamilyTitles === t.id
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{t.name}</span>
                        {form.fontFamilyTitles === t.id && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div
                        className="text-xs font-black uppercase tracking-tight mt-1.5 text-slate-800"
                        style={{ fontFamily: t.font }}
                      >
                        INFORME DE INSPECCIÓN
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: TAMAÑO DE CADA TEXTO (INDIVIDUAL)
             ======================================================== */}
          {activeTab === 'sizes' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-950">
                <p className="font-bold text-[11px] mb-0.5 flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Ajuste Individual del Tamaño de Cada Texto:</span>
                </p>
                <p className="text-[11px] text-indigo-800">
                  Configura con precisión el tamaño en píxeles (px) para cada elemento de la hoja oficial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Título Principal */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Título Principal del Informe:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeReportTitle} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    step={1}
                    value={form.fontSizeReportTitle}
                    onChange={(e) => handleChange('fontSizeReportTitle', parseInt(e.target.value) || 18)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-black uppercase truncate text-slate-900 border p-1 rounded bg-white"
                    style={{ fontSize: `${form.fontSizeReportTitle}px`, fontFamily: activeTitleFontCss }}
                  >
                    {form.reportTitle || 'INFORME DE INSPECCIÓN'}
                  </div>
                </div>

                {/* Subtítulo Superior */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Subtítulo Superior Normativo:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeHeaderSubtitle} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={14}
                    step={1}
                    value={form.fontSizeHeaderSubtitle}
                    onChange={(e) => handleChange('fontSizeHeaderSubtitle', parseInt(e.target.value) || 9)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-bold uppercase tracking-widest truncate text-slate-700 border p-1 rounded bg-white"
                    style={{ fontSize: `${form.fontSizeHeaderSubtitle}px` }}
                  >
                    {form.headerSubtitle || 'Formato de Trabajo Normativo'}
                  </div>
                </div>

                {/* Referencia de Procedimiento */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Referencia de Procedimiento:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeProcedureRef} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={14}
                    step={1}
                    value={form.fontSizeProcedureRef}
                    onChange={(e) => handleChange('fontSizeProcedureRef', parseInt(e.target.value) || 9)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="italic truncate text-slate-700 border p-1 rounded bg-white"
                    style={{ fontSize: `${form.fontSizeProcedureRef}px` }}
                  >
                    {form.procedureReference || 'Procedimiento de Calidad'}
                  </div>
                </div>

                {/* Títulos de Secciones */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Títulos de Secciones (I a VII):</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeSectionTitles} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={18}
                    step={1}
                    value={form.fontSizeSectionTitles}
                    onChange={(e) => handleChange('fontSizeSectionTitles', parseInt(e.target.value) || 13)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-bold uppercase truncate border p-1 rounded"
                    style={{
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontFamily: activeTitleFontCss,
                    }}
                  >
                    I. DATOS GENERALES DE INSPECCIÓN
                  </div>
                </div>

                {/* Etiquetas de Celdas */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Etiquetas de Celdas Fijas:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeCellLabels} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={14}
                    step={1}
                    value={form.fontSizeCellLabels}
                    onChange={(e) => handleChange('fontSizeCellLabels', parseInt(e.target.value) || 10)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-bold uppercase border p-1 rounded"
                    style={{
                      fontSize: `${form.fontSizeCellLabels}px`,
                      backgroundColor: form.cellLabelBgColor,
                      color: form.cellLabelTextColor,
                    }}
                  >
                    INSPECTOR: / FECHA: / LOTE TOTAL (N):
                  </div>
                </div>

                {/* Valores y Datos en Celdas */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Texto de Valores y Datos en Celdas:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeCellValues} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={9}
                    max={16}
                    step={1}
                    value={form.fontSizeCellValues}
                    onChange={(e) => handleChange('fontSizeCellValues', parseInt(e.target.value) || 12)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-medium border p-1 rounded bg-white"
                    style={{
                      fontSize: `${form.fontSizeCellValues}px`,
                      color: form.cellValueTextColor,
                    }}
                  >
                    Lic. Laura Martínez / 500 Piezas / C0361-02
                  </div>
                </div>

                {/* Metadatos (Código, Versión, Folio) */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Etiquetas Metadatos Encabezado:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeMetadataLabels} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={13}
                    step={1}
                    value={form.fontSizeMetadataLabels}
                    onChange={(e) => handleChange('fontSizeMetadataLabels', parseInt(e.target.value) || 9)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-mono font-bold border p-1 rounded bg-white"
                    style={{
                      fontSize: `${form.fontSizeMetadataLabels}px`,
                      color: form.metadataLabelTextColor,
                    }}
                  >
                    CÓDIGO: VERSIÓN: REVISIÓN:
                  </div>
                </div>

                {/* Encabezados de Tablas Secundarias */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Encabezados Tablas Internas:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeTableHeaders} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={14}
                    step={1}
                    value={form.fontSizeTableHeaders}
                    onChange={(e) => handleChange('fontSizeTableHeaders', parseInt(e.target.value) || 10)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="font-bold uppercase border p-1 rounded"
                    style={{
                      fontSize: `${form.fontSizeTableHeaders}px`,
                      backgroundColor: form.tableSubHeaderBgColor,
                      color: form.tableSubHeaderTextColor,
                    }}
                  >
                    Categoría / Criterio / Severidad / Defectos
                  </div>
                </div>

                {/* Nota al Pie de Página */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Nota Legal de Pie de Página:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-indigo-700">
                      {form.fontSizeFooterNote || 9} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={12}
                    step={1}
                    value={form.fontSizeFooterNote || 9}
                    onChange={(e) => handleChange('fontSizeFooterNote', parseInt(e.target.value) || 9)}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div
                    className="italic font-mono border p-1 rounded bg-white truncate"
                    style={{
                      fontSize: `${form.fontSizeFooterNote || 9}px`,
                      color: form.subtitleTextColor,
                    }}
                  >
                    Documento normativo propiedad de Suave y Fácil S. A. de C.V.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: COLOR DE LAS LETRAS DE CADA TEXTO (INDIVIDUAL)
             ======================================================== */}
          {activeTab === 'textColors' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-950">
                <p className="font-bold text-[11px] mb-0.5 flex items-center space-x-1.5">
                  <Paintbrush className="w-4 h-4 text-indigo-600" />
                  <span>Color de Letra Individual para Cada Elemento:</span>
                </p>
                <p className="text-[11px] text-indigo-800">
                  Personaliza el color de texto exacto de cada elemento de manera independiente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Color de Letra: Título Principal */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Título Principal:</label>
                    <span className="text-[10px] text-slate-500">Ej. INFORME DE INSPECCIÓN</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.titleTextColor}
                      onChange={(e) => handleChange('titleTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.titleTextColor}
                      onChange={(e) => handleChange('titleTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Subtítulo Superior */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Subtítulo Superior:</label>
                    <span className="text-[10px] text-slate-500">Ej. Formato de Trabajo Normativo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.subtitleTextColor}
                      onChange={(e) => handleChange('subtitleTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.subtitleTextColor}
                      onChange={(e) => handleChange('subtitleTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Referencia Procedimiento */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Procedimiento / Referencia:</label>
                    <span className="text-[10px] text-slate-500">Texto en cursiva bajo título</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.procedureRefTextColor}
                      onChange={(e) => handleChange('procedureRefTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.procedureRefTextColor}
                      onChange={(e) => handleChange('procedureRefTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Títulos de Sección */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Títulos de Secciones (I-VII):</label>
                    <span className="text-[10px] text-slate-500">Texto sobre barras de sección</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.sectionHeaderTextColor}
                      onChange={(e) => {
                        handleChange('sectionHeaderTextColor', e.target.value);
                        handleChange('headerTextColor', e.target.value);
                      }}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.sectionHeaderTextColor}
                      onChange={(e) => {
                        handleChange('sectionHeaderTextColor', e.target.value);
                        handleChange('headerTextColor', e.target.value);
                      }}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Etiquetas de Celdas */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Etiquetas de Celdas:</label>
                    <span className="text-[10px] text-slate-500">Inspector:, Fecha:, Clave/SKU:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.cellLabelTextColor}
                      onChange={(e) => {
                        handleChange('cellLabelTextColor', e.target.value);
                        handleChange('cellHeaderTextColor', e.target.value);
                      }}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.cellLabelTextColor}
                      onChange={(e) => {
                        handleChange('cellLabelTextColor', e.target.value);
                        handleChange('cellHeaderTextColor', e.target.value);
                      }}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Valores y Datos */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Texto de Datos / Valores:</label>
                    <span className="text-[10px] text-slate-500">Datos escritos e ingresados</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.cellValueTextColor}
                      onChange={(e) => handleChange('cellValueTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.cellValueTextColor}
                      onChange={(e) => handleChange('cellValueTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Etiquetas Metadatos */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Etiquetas Metadatos:</label>
                    <span className="text-[10px] text-slate-500">CÓDIGO:, VERSIÓN:, REVISIÓN:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.metadataLabelTextColor}
                      onChange={(e) => handleChange('metadataLabelTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.metadataLabelTextColor}
                      onChange={(e) => handleChange('metadataLabelTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Valores Metadatos */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Valores de Metadatos:</label>
                    <span className="text-[10px] text-slate-500">Ej. CVD-CCA-F-08, 00, 2026-08</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.metadataValueTextColor}
                      onChange={(e) => handleChange('metadataValueTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.metadataValueTextColor}
                      onChange={(e) => handleChange('metadataValueTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {/* Color de Letra: Cabeceras de Tablas */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between col-span-1 sm:col-span-2">
                  <div>
                    <label className="block font-bold text-slate-800">Texto Cabeceras de Tablas Internas:</label>
                    <span className="text-[10px] text-slate-500">Cabeceras de AQL, Matriz de defectos e insumos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={form.tableSubHeaderTextColor}
                      onChange={(e) => handleChange('tableSubHeaderTextColor', e.target.value)}
                      className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.tableSubHeaderTextColor}
                      onChange={(e) => handleChange('tableSubHeaderTextColor', e.target.value)}
                      className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 5: COLORES DE RECUADROS Y FONDOS
             ======================================================== */}
          {activeTab === 'boxColors' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Presets Rápidos */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Paletas de Color Rápidas (Aplicar con 1 Clic):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-left p-2 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-xs transition bg-white flex items-center space-x-2 cursor-pointer"
                    >
                      <div
                        className="w-5 h-5 rounded-md border shrink-0"
                        style={{ backgroundColor: preset.sectionHeaderBg, borderColor: preset.border }}
                      />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selectores Específicos de Fondo y Bordes */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800">
                  Colores de Fondo de Celdas y Bordes:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Fondo de Barras de Sección */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">Fondo de Barras de Sección:</span>
                      <span className="text-[10px] text-slate-500">Color de fondo de Secciones I a VII</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={form.sectionHeaderBgColor || form.headerBgColor}
                        onChange={(e) => {
                          handleChange('sectionHeaderBgColor', e.target.value);
                          handleChange('headerBgColor', e.target.value);
                        }}
                        className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.sectionHeaderBgColor || form.headerBgColor}
                        onChange={(e) => {
                          handleChange('sectionHeaderBgColor', e.target.value);
                          handleChange('headerBgColor', e.target.value);
                        }}
                        className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  {/* Color de Bordes y Cuadrícula */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">Líneas y Bordes de Cuadrícula:</span>
                      <span className="text-[10px] text-slate-500">Color de líneas de todas las tablas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={form.tableBorderColor}
                        onChange={(e) => handleChange('tableBorderColor', e.target.value)}
                        className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.tableBorderColor}
                        onChange={(e) => handleChange('tableBorderColor', e.target.value)}
                        className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  {/* Fondo de Celdas de Etiquetas */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">Fondo de Celdas de Etiquetas:</span>
                      <span className="text-[10px] text-slate-500">Celdas de encabezado fijas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={form.cellLabelBgColor || form.cellHeaderBgColor}
                        onChange={(e) => {
                          handleChange('cellLabelBgColor', e.target.value);
                          handleChange('cellHeaderBgColor', e.target.value);
                        }}
                        className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.cellLabelBgColor || form.cellHeaderBgColor}
                        onChange={(e) => {
                          handleChange('cellLabelBgColor', e.target.value);
                          handleChange('cellHeaderBgColor', e.target.value);
                        }}
                        className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  {/* Fondo de Bloque de Metadatos Superior */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">Fondo Bloque Metadatos:</span>
                      <span className="text-[10px] text-slate-500">Recuadro superior derecho</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={form.metadataBgColor}
                        onChange={(e) => handleChange('metadataBgColor', e.target.value)}
                        className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.metadataBgColor}
                        onChange={(e) => handleChange('metadataBgColor', e.target.value)}
                        className="font-mono text-xs w-20 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 6: TÍTULOS Y TEXTOS FIJOS DEL ENCABEZADO
             ======================================================== */}
          {activeTab === 'titles' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900">
                <p className="font-bold text-[11px] mb-0.5">Textos Normativos del Formato Oficial:</p>
                <p className="text-[11px] text-indigo-800">
                  Modifica los textos normativos fijos que encabezan la hoja de inspección.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Título Principal del Documento:
                  </label>
                  <input
                    type="text"
                    value={form.reportTitle}
                    onChange={(e) => handleChange('reportTitle', e.target.value)}
                    placeholder="INFORME DE INSPECCIÓN MAQUILA"
                    className="w-full font-black text-sm px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Subtítulo Superior:
                  </label>
                  <input
                    type="text"
                    value={form.headerSubtitle}
                    onChange={(e) => handleChange('headerSubtitle', e.target.value)}
                    placeholder="Formato de Trabajo Normativo"
                    className="w-full font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Procedimiento / Referencia Normativa:
                  </label>
                  <input
                    type="text"
                    value={form.procedureReference}
                    onChange={(e) => handleChange('procedureReference', e.target.value)}
                    placeholder="Procedimiento CVD-AMA-PR-01 • Gestión e Intervención de Productos"
                    className="w-full font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código Oficial del Formato:
                  </label>
                  <input
                    type="text"
                    value={form.documentCode}
                    onChange={(e) => handleChange('documentCode', e.target.value)}
                    placeholder="CVD-CCA-F-08"
                    className="w-full font-mono font-black px-3 py-2 border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Versión Oficial del Formato:
                  </label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                    placeholder="00"
                    className="w-full font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha de Revisión Documental:
                  </label>
                  <input
                    type="date"
                    value={form.revisionDate}
                    onChange={(e) => handleChange('revisionDate', e.target.value)}
                    className="w-full font-mono px-3 py-2 border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 7: TÍTULOS DE SECCIONES (I A VII)
             ======================================================== */}
          {activeTab === 'sections' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900">
                <p className="font-bold text-[11px] mb-0.5">Títulos de Secciones I a VII:</p>
                <p className="text-[11px] text-indigo-800">
                  Renombra los encabezados que dividen cada sección del formato oficial según tus requerimientos.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección I:</label>
                  <input
                    type="text"
                    value={form.section1Title}
                    onChange={(e) => handleChange('section1Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección II:</label>
                  <input
                    type="text"
                    value={form.section2Title}
                    onChange={(e) => handleChange('section2Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección III:</label>
                  <input
                    type="text"
                    value={form.section3Title}
                    onChange={(e) => handleChange('section3Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección IV:</label>
                  <input
                    type="text"
                    value={form.section4Title}
                    onChange={(e) => handleChange('section4Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección V:</label>
                  <input
                    type="text"
                    value={form.section5Title}
                    onChange={(e) => handleChange('section5Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección VI:</label>
                  <input
                    type="text"
                    value={form.section6Title}
                    onChange={(e) => handleChange('section6Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Sección VII:</label>
                  <input
                    type="text"
                    value={form.section7Title}
                    onChange={(e) => handleChange('section7Title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-2 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores Iniciales</span>
          </button>

          <div className="flex items-center space-x-2">
            {savedSuccess && (
              <span className="text-emerald-700 font-bold text-xs flex items-center space-x-1 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>¡Cambios Guardados Exitosamente!</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ventana Modal de Confirmación de Borrado / Restablecimiento */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        itemName={confirmModal.itemName}
        itemType={confirmModal.itemType}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
};
