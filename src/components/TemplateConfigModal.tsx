import React, { useState, useEffect, useRef } from 'react';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import { QualityReport } from '../types/qualityReport';
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
  Paintbrush,
  Database,
  Cloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layers,
  ArrowUpDown,
  MoveVertical,
  Download,
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  saveTemplateConfigToSupabase,
  syncTemplateConfigFromSupabase,
  saveStoredTemplateConfig,
  fetchPresetsFromSupabase,
  TemplatePresetRecord,
} from '../utils/templateConfigStore';
import { FONT_OPTIONS, getTitleFontCss, getGeneralFontCss } from '../utils/templateFontUtils';
import { downloadOfficialSheetPdf } from '../utils/officialSheetPdfExport';
import { SAMPLE_REPORTS } from '../data/sampleReports';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetTemplateConfig;
  onSaveConfig: (newConfig: SheetTemplateConfig) => void;
  onOpenCatalogUpload?: () => void;
  currentReport?: QualityReport;
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

export const TemplateConfigModal: React.FC<TemplateConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenCatalogUpload,
  currentReport,
}) => {
  const [activeTab, setActiveTab] = useState<'alignment' | 'colors' | 'spacing' | 'typography' | 'texts' | 'presets'>('alignment');
  const [form, setForm] = useState<SheetTemplateConfig>(() => ({ ...DEFAULT_TEMPLATE_CONFIG, ...config }));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'local' | 'saving'>('synced');
  const [customPresets, setCustomPresets] = useState<TemplatePresetRecord[]>([]);
  const [zoom, setZoom] = useState<number>(0.85);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULT_TEMPLATE_CONFIG, ...config });
      setSavedSuccess(false);

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
      message: '¿Estás seguro de restablecer todos los alineados, colores, tamaños, espaciados y textos a los valores predeterminados? También se actualizará en Supabase.',
      confirmText: 'Sí, restablecer valores',
      onConfirm: async () => {
        setForm(DEFAULT_TEMPLATE_CONFIG);
        onSaveConfig(DEFAULT_TEMPLATE_CONFIG);
        saveStoredTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
        setCloudStatus('saving');
        await saveTemplateConfigToSupabase(DEFAULT_TEMPLATE_CONFIG);
        setCloudStatus('synced');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      },
    });
  };

  const handleSave = async () => {
    onSaveConfig(form);
    saveStoredTemplateConfig(form);

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
    }, 700);
  };

  const handleDownloadTestPdf = async () => {
    setIsExportingPdf(true);
    try {
      const rep = currentReport || SAMPLE_REPORTS[0];
      await downloadOfficialSheetPdf(
        rep,
        form,
        `PRUEBA_CARTA_${form.documentCode || 'CVD-CCA-F-08'}.pdf`,
        'official-template-preview-sheet'
      );
    } catch (err) {
      console.error('Error al generar PDF de prueba:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeGeneralFontCss = getGeneralFontCss(form.fontFamilyGeneral);
  const activeTitleFontCss = getTitleFontCss(form.fontFamilyTitles);

  // Format spacing & dimensions
  const padV = form.cellPaddingVertical !== undefined ? form.cellPaddingVertical : 5;
  const padH = form.cellPaddingHorizontal !== undefined ? form.cellPaddingHorizontal : 7;
  const lineH = form.lineHeightMultiplier !== undefined ? form.lineHeightMultiplier : 1.35;
  const bWidth = form.tableBorderWidth !== undefined ? form.tableBorderWidth : 1.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-950/90 backdrop-blur-md overflow-hidden font-sans">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full h-[98vh] max-w-[1700px] overflow-hidden flex flex-col">
        {/* ================= BARRA SUPERIOR EJECUTIVA ESTILO WORD ================= */}
        <div className="bg-slate-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black shadow-md flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm sm:text-base tracking-wide text-white uppercase flex items-center space-x-2">
                  <span>Diseñador del Formato Oficial</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Carta 8.5" x 11" (Word Style)
                  </span>
                </h2>
                {cloudStatus === 'synced' && (
                  <span className="hidden lg:inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Supabase DB Sincronizado</span>
                  </span>
                )}
                {cloudStatus === 'saving' && (
                  <span className="hidden lg:inline-flex items-center space-x-1 bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[10px] px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    <Cloud className="w-3 h-3 text-amber-400" />
                    <span>Guardando en Supabase...</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Centra títulos, elige color para cada letra, elimina textos cortados con padding dinámico y visualiza en la hoja en vivo.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Controles de Zoom para la hoja */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 space-x-1 text-slate-300">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 100) / 100))}
                className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                title="Alejar hoja"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold w-12 text-center text-emerald-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(1.25, Math.round((prev + 0.1) * 100) / 100))}
                className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                title="Acercar hoja"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.85)}
                className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white font-semibold transition cursor-pointer"
                title="Ajustar a 85%"
              >
                Reset
              </button>
            </div>

            {onOpenCatalogUpload && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCatalogUpload();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                title="Abrir la ventana de catálogo de armados y componentes (Excel / CSV)"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Catálogo Armados</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Restablecer valores de fábrica"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTestPdf}
              disabled={isExportingPdf}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Descargar Hoja Oficial PDF en tamaño carta exacto con la configuración visual actual"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isExportingPdf ? 'Generando...' : 'Probar PDF Carta'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl shadow-lg flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>¡Aplicado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar y Aplicar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Cerrar diseñador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CONTENEDOR PRINCIPAL: PANEL IZQ (CONTROLES) + PANEL DER (HOJA CARTA 1:1) ================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">
          {/* PANEL IZQUIERDO: HERRAMIENTAS Y ESTILOS (4 COLUMNAS) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden h-full">
            {/* Pestañas de configuración */}
            <div className="flex border-b border-slate-800 bg-slate-950/80 p-1.5 gap-1 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('alignment')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'alignment'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Alineación</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('colors')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'colors'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Colores</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('spacing')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'spacing'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <MoveVertical className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Espaciado</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('typography')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'typography'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Fuentes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('texts')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'texts'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Textos/Logo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] whitespace-nowrap">Plantillas</span>
              </button>
            </div>

            {/* Contenido de la pestaña activa */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200 text-xs">
              {/* ========== PESTAÑA 1: ALINEACIÓN Y CENTRADO (WORD STYLE) ========== */}
              {activeTab === 'alignment' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <AlignCenter className="w-4 h-4 text-emerald-400" />
                      <span>Alineación de Encabezados (Estilo Word)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Personaliza hacia dónde se orienta cada línea de la cabecera normativa como en Microsoft Word.
                    </p>

                    {/* Título Principal del Reporte */}
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Título Principal del Reporte</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold capitalize">
                          {form.alignReportTitle}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleChange('alignReportTitle', align)}
                            className={`py-1.5 px-2 rounded border flex items-center justify-center space-x-1 text-xs font-bold transition cursor-pointer ${
                              form.alignReportTitle === align
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            <span className="capitalize">{align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtítulo Normativo Superior */}
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Subtítulo Normativo Superior</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold capitalize">
                          {form.alignHeaderSubtitle}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleChange('alignHeaderSubtitle', align)}
                            className={`py-1.5 px-2 rounded border flex items-center justify-center space-x-1 text-xs font-bold transition cursor-pointer ${
                              form.alignHeaderSubtitle === align
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            <span className="capitalize">{align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Referencia de Procedimiento */}
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Referencia de Procedimiento</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold capitalize">
                          {form.alignProcedureRef}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleChange('alignProcedureRef', align)}
                            className={`py-1.5 px-2 rounded border flex items-center justify-center space-x-1 text-xs font-bold transition cursor-pointer ${
                              form.alignProcedureRef === align
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            <span className="capitalize">{align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Barras de Título de Secciones (I - VII) */}
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Títulos de Secciones (I a VII)</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold capitalize">
                          {form.alignSectionTitles}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleChange('alignSectionTitles', align)}
                            className={`py-1.5 px-2 rounded border flex items-center justify-center space-x-1 text-xs font-bold transition cursor-pointer ${
                              form.alignSectionTitles === align
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            <span className="capitalize">{align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== PESTAÑA 2: COLORES DE LETRAS Y ELEMENTOS ========== */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Palette className="w-4 h-4 text-emerald-400" />
                      <span>Color de Cada Letra y Elemento</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Modifica individualmente el color de la letra para cada título, texto de celda o barra.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Color de Título Principal */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Título Principal
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.titleTextColor}
                            onChange={(e) => handleChange('titleTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.titleTextColor}
                            onChange={(e) => handleChange('titleTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Color de Subtítulo */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Subtítulo Normativo
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.subtitleTextColor}
                            onChange={(e) => handleChange('subtitleTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.subtitleTextColor}
                            onChange={(e) => handleChange('subtitleTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Color de Procedimiento */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Procedimiento
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.procedureRefTextColor}
                            onChange={(e) => handleChange('procedureRefTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.procedureRefTextColor}
                            onChange={(e) => handleChange('procedureRefTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Fondo de Barra de Sección */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Fondo: Barras de Sección (I - VII)
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.sectionHeaderBgColor}
                            onChange={(e) => handleChange('sectionHeaderBgColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.sectionHeaderBgColor}
                            onChange={(e) => handleChange('sectionHeaderBgColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Letra de Barra de Sección */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Barras de Sección
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.sectionHeaderTextColor}
                            onChange={(e) => handleChange('sectionHeaderTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.sectionHeaderTextColor}
                            onChange={(e) => handleChange('sectionHeaderTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Fondo de Etiquetas de Celdas */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Fondo: Etiquetas de Celdas
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.cellLabelBgColor}
                            onChange={(e) => handleChange('cellLabelBgColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.cellLabelBgColor}
                            onChange={(e) => handleChange('cellLabelBgColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Letra de Etiquetas de Celdas */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Etiquetas de Celdas
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.cellLabelTextColor}
                            onChange={(e) => handleChange('cellLabelTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.cellLabelTextColor}
                            onChange={(e) => handleChange('cellLabelTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Letra de Valores y Datos */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Letra: Valores y Datos Escritos
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.cellValueTextColor}
                            onChange={(e) => handleChange('cellValueTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.cellValueTextColor}
                            onChange={(e) => handleChange('cellValueTextColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Color de Bordes de Tablas */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Color de Líneas y Bordes
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.tableBorderColor}
                            onChange={(e) => handleChange('tableBorderColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.tableBorderColor}
                            onChange={(e) => handleChange('tableBorderColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>

                      {/* Fondo de Metadatos */}
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Fondo: Recuadro Metadatos
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={form.metadataBgColor}
                            onChange={(e) => handleChange('metadataBgColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={form.metadataBgColor}
                            onChange={(e) => handleChange('metadataBgColor', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== PESTAÑA 3: ESPACIADO Y ANTI-CORTE DE CELDAS ========== */}
              {activeTab === 'spacing' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <MoveVertical className="w-4 h-4 text-emerald-400" />
                      <span>Espaciado de Celdas (Anti-Cortes de Texto)</span>
                    </h3>
                    <p className="text-[11px] text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-600/40">
                      💡 <strong>Solución a textos cortados:</strong> Aumenta el relleno vertical y el interlineado para evitar que las líneas divisorias horizontales de la tabla atraviesen letras descendentes (g, p, y, q).
                    </p>

                    {/* Relleno Vertical de Celda */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Relleno Vertical (Padding Top / Bottom)</span>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                          {padV} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={14}
                        step={1}
                        value={padV}
                        onChange={(e) => handleChange('cellPaddingVertical', parseInt(e.target.value) || 6)}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>3px (Muy Compacto)</span>
                        <span>6px (Estándar)</span>
                        <span>14px (Muy Amplio)</span>
                      </div>
                    </div>

                    {/* Relleno Horizontal de Celda */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Relleno Horizontal (Padding Left / Right)</span>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                          {padH} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={16}
                        step={1}
                        value={padH}
                        onChange={(e) => handleChange('cellPaddingHorizontal', parseInt(e.target.value) || 8)}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>4px (Estrecho)</span>
                        <span>8px (Normal)</span>
                        <span>16px (Espacioso)</span>
                      </div>
                    </div>

                    {/* Interlineado del Documento */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Interlineado (Line-Height Multiplier)</span>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                          {lineH}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.15}
                        max={1.80}
                        step={0.05}
                        value={lineH}
                        onChange={(e) => handleChange('lineHeightMultiplier', parseFloat(e.target.value) || 1.4)}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>1.15x (Apretado)</span>
                        <span>1.40x (Recomendado)</span>
                        <span>1.80x (Aireado)</span>
                      </div>
                    </div>

                    {/* Grosor de Bordes de Tablas */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Grosor de Líneas y Bordes de Tablas</span>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                          {bWidth} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        step={1}
                        value={bWidth}
                        onChange={(e) => handleChange('tableBorderWidth', parseInt(e.target.value) || 2)}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>1px (Fino)</span>
                        <span>2px (Oficial Normativo)</span>
                        <span>4px (Marcado)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== PESTAÑA 4: TIPOGRAFÍA Y TAMAÑOS ========== */}
              {activeTab === 'typography' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Type className="w-4 h-4 text-emerald-400" />
                      <span>Tipografías y Tamaños de Letra</span>
                    </h3>

                    {/* Tipografía General */}
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">
                        Familia Tipográfica del Documento
                      </label>
                      <select
                        value={form.fontFamilyGeneral}
                        onChange={(e) => handleChange('fontFamilyGeneral', e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-emerald-500 cursor-pointer"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.id} value={font.id}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sliders de Tamaño */}
                    <div className="space-y-2.5 pt-1">
                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">Título Principal del Reporte</span>
                          <span className="font-mono text-emerald-400 font-bold">{form.fontSizeReportTitle} px</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={26}
                          value={form.fontSizeReportTitle}
                          onChange={(e) => handleChange('fontSizeReportTitle', parseInt(e.target.value) || 18)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">Títulos de Secciones (I - VII)</span>
                          <span className="font-mono text-emerald-400 font-bold">{form.fontSizeSectionTitles} px</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={18}
                          value={form.fontSizeSectionTitles}
                          onChange={(e) => handleChange('fontSizeSectionTitles', parseInt(e.target.value) || 13)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">Etiquetas de Celdas</span>
                          <span className="font-mono text-emerald-400 font-bold">{form.fontSizeCellLabels} px</span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={14}
                          value={form.fontSizeCellLabels}
                          onChange={(e) => handleChange('fontSizeCellLabels', parseInt(e.target.value) || 10)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">Valores y Datos de Celdas</span>
                          <span className="font-mono text-emerald-400 font-bold">{form.fontSizeCellValues} px</span>
                        </div>
                        <input
                          type="range"
                          min={9}
                          max={16}
                          value={form.fontSizeCellValues}
                          onChange={(e) => handleChange('fontSizeCellValues', parseInt(e.target.value) || 12)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== PESTAÑA 5: TEXTOS NORMATIVOS Y LOGO ========== */}
              {activeTab === 'texts' && (
                <div className="space-y-4">
                  {/* Logotipo */}
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Logotipo de la Empresa</span>
                    </h3>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-3 text-center transition ${
                        isDragOver
                          ? 'border-emerald-500 bg-emerald-950/30'
                          : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
                      }`}
                    >
                      {form.logoImageUrl ? (
                        <div className="flex flex-col items-center space-y-2">
                          <img
                            src={form.logoImageUrl}
                            alt="Logo"
                            style={{ maxHeight: `${Math.min(form.logoHeight || 48, 65)}px` }}
                            className="object-contain bg-white p-1 rounded"
                          />
                          <div className="flex space-x-2">
                            <label className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer border border-slate-700 transition">
                              <span>Cambiar Imagen</span>
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleChange('logoImageUrl', '')}
                              className="bg-red-950/80 hover:bg-red-900 text-red-300 text-[11px] font-bold px-2.5 py-1 rounded border border-red-700 transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Quitar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-3">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs font-bold text-slate-300">Arrastra una imagen o haz clic aquí</span>
                          <span className="text-[10px] text-slate-500">PNG, JPG, SVG o WebP</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    {form.logoImageUrl && (
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-300">Altura del Logo</span>
                          <span className="font-mono text-emerald-400 font-bold">{form.logoHeight || 48} px</span>
                        </div>
                        <input
                          type="range"
                          min={25}
                          max={85}
                          value={form.logoHeight || 48}
                          onChange={(e) => handleChange('logoHeight', parseInt(e.target.value) || 48)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Subtítulo Bajo el Logo
                      </label>
                      <input
                        type="text"
                        value={form.logoSubtitle}
                        onChange={(e) => handleChange('logoSubtitle', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs font-semibold text-white focus:outline-emerald-500"
                        placeholder="Ej. CALIDAD EN OPERACIONES Y MAQUILA"
                      />
                    </div>
                  </div>

                  {/* Textos Oficiales */}
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-2.5">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Textos del Formato Normativo</span>
                    </h3>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Título del Reporte</label>
                      <input
                        type="text"
                        value={form.reportTitle}
                        onChange={(e) => handleChange('reportTitle', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-white focus:outline-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Subtítulo Normativo</label>
                      <input
                        type="text"
                        value={form.headerSubtitle}
                        onChange={(e) => handleChange('headerSubtitle', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-semibold text-white focus:outline-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Procedimiento Normativo</label>
                      <input
                        type="text"
                        value={form.procedureReference}
                        onChange={(e) => handleChange('procedureReference', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-semibold text-white focus:outline-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Código Oficial</label>
                        <input
                          type="text"
                          value={form.documentCode}
                          onChange={(e) => handleChange('documentCode', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Versión</label>
                        <input
                          type="text"
                          value={form.version}
                          onChange={(e) => handleChange('version', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== PESTAÑA 6: PLANTILLAS PREDEFINIDAS ========== */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Plantillas de Diseño Preconfiguradas (1 Clic)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Aplica al instante paletas de colores corporativos probadas y normativas.
                    </p>

                    <div className="space-y-2">
                      {COLOR_PRESETS.map((preset) => (
                        <div
                          key={preset.name}
                          onClick={() => handleApplyPreset(preset)}
                          className="p-2.5 rounded-xl border border-slate-700 hover:border-emerald-500 bg-slate-900 hover:bg-slate-850 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex -space-x-1">
                              <span
                                className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: preset.sectionHeaderBg }}
                              />
                              <span
                                className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: preset.border }}
                              />
                              <span
                                className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: preset.cellLabelBg }}
                              />
                            </div>
                            <span className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition">
                              {preset.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-400 font-bold uppercase tracking-wider">
                            Aplicar
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= PANEL DERECHO: HOJA CARTA EN VIVO TIPO WORD (7/8 COLUMNAS) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 bg-slate-950 flex flex-col h-full overflow-hidden relative">
            {/* Cabecera del Lienzo */}
            <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lienzo de Hoja Tamaño Carta (Word Layout 1:1)</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                8.5" x 11" (Letter) • Cambios en tiempo real
              </span>
            </div>

            {/* Área de trabajo de desplazamiento con la hoja centrada */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/95 flex justify-center items-start">
              {/* HOJA CARTA FÍSICA */}
              <div
                id="official-template-preview-sheet"
                className="bg-white shadow-2xl transition-transform origin-top text-slate-900 border border-slate-400/30"
                style={{
                  width: '816px',
                  minHeight: '1056px',
                  padding: '24px 28px',
                  transform: `scale(${zoom})`,
                  marginBottom: `${(1 - zoom) * -500}px`,
                  fontFamily: activeGeneralFontCss,
                }}
              >
                {/* 1. CABECERA NORMATIVA CON ALINEACIONES Y COLORES EN VIVO */}
                <div
                  className="mb-4 bg-white"
                  style={{
                    border: `${bWidth}px solid ${form.tableBorderColor}`,
                  }}
                >
                  <div
                    className="grid grid-cols-12 divide-x divide-y text-center"
                    style={{ borderColor: form.tableBorderColor }}
                  >
                    {/* Logotipo */}
                    <div className="col-span-3 p-2 flex flex-col items-center justify-center bg-white min-h-[60px]">
                      {form.logoImageUrl ? (
                        <img
                          src={form.logoImageUrl}
                          alt="Logo"
                          style={{ maxHeight: `${form.logoHeight || 48}px` }}
                          className="max-w-full object-contain mb-1"
                        />
                      ) : (
                        <div className="text-[10px] font-mono text-slate-400 italic">[Espacio Logotipo]</div>
                      )}
                      {form.logoSubtitle && (
                        <span
                          className="font-bold uppercase tracking-wider text-center"
                          style={{
                            fontSize: `${form.fontSizeHeaderSubtitle}px`,
                            color: form.subtitleTextColor,
                          }}
                        >
                          {form.logoSubtitle}
                        </span>
                      )}
                    </div>

                    {/* Bloque de Título con Alineación Configurada */}
                    <div
                      className="col-span-6 p-2 flex flex-col justify-center"
                      style={{
                        backgroundColor: form.metadataBgColor,
                        textAlign: form.alignReportTitle,
                      }}
                    >
                      <span
                        className="font-bold uppercase tracking-[0.2em]"
                        style={{
                          fontSize: `${form.fontSizeHeaderSubtitle}px`,
                          color: form.subtitleTextColor,
                          textAlign: form.alignHeaderSubtitle,
                        }}
                      >
                        {form.headerSubtitle}
                      </span>
                      <h1
                        className="font-black uppercase tracking-tight leading-tight my-0.5"
                        style={{
                          fontSize: `${form.fontSizeReportTitle}px`,
                          color: form.titleTextColor,
                          fontFamily: activeTitleFontCss,
                          textAlign: form.alignReportTitle,
                        }}
                      >
                        {form.reportTitle}
                      </h1>
                      <span
                        className="font-medium italic"
                        style={{
                          fontSize: `${form.fontSizeProcedureRef}px`,
                          color: form.procedureRefTextColor,
                          textAlign: form.alignProcedureRef,
                        }}
                      >
                        {form.procedureReference}
                      </span>
                    </div>

                    {/* Metadatos */}
                    <div
                      className="col-span-3 text-[9px] font-mono grid grid-cols-2 divide-x divide-y"
                      style={{
                        backgroundColor: form.metadataBgColor,
                        borderColor: form.tableBorderColor,
                      }}
                    >
                      <div
                        className="p-1 font-bold flex items-center"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.metadataLabelTextColor,
                          fontSize: `${form.fontSizeMetadataLabels}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        CÓDIGO:
                      </div>
                      <div
                        className="p-1 font-bold bg-white flex items-center justify-center"
                        style={{
                          color: form.metadataValueTextColor,
                          fontSize: `${form.fontSizeMetadataValues}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        {form.documentCode}
                      </div>

                      <div
                        className="p-1 font-bold flex items-center"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.metadataLabelTextColor,
                          fontSize: `${form.fontSizeMetadataLabels}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        VERSIÓN:
                      </div>
                      <div
                        className="p-1 font-bold bg-white flex items-center justify-center"
                        style={{
                          color: form.metadataValueTextColor,
                          fontSize: `${form.fontSizeMetadataValues}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        {form.version}
                      </div>

                      <div
                        className="p-1 font-bold flex items-center"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.metadataLabelTextColor,
                          fontSize: `${form.fontSizeMetadataLabels}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        REVISIÓN:
                      </div>
                      <div
                        className="p-1 bg-white flex items-center justify-center"
                        style={{
                          color: form.metadataValueTextColor,
                          fontSize: `${form.fontSizeMetadataValues}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        {form.revisionDate}
                      </div>

                      <div
                        className="p-1 font-bold flex items-center"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.metadataLabelTextColor,
                          fontSize: `${form.fontSizeMetadataLabels}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        FOLIO / OT:
                      </div>
                      <div
                        className="p-1 font-black text-white flex items-center justify-center"
                        style={{
                          backgroundColor: form.sectionHeaderBgColor,
                          fontSize: `${form.fontSizeMetadataValues}px`,
                          borderColor: form.tableBorderColor,
                        }}
                      >
                        0001
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN I: DATOS GENERALES DE INSPECCIÓN */}
                <div className="mb-3.5">
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider flex items-center justify-between"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                      textAlign: form.alignSectionTitles,
                    }}
                  >
                    <span>{form.section1Title}</span>
                    <span className="text-[10px] font-mono opacity-80">{form.documentCode}</span>
                  </div>

                  <table
                    className="w-full border-collapse text-xs"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}` }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="font-bold border uppercase tracking-wider w-1/6"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Inspector:
                        </td>
                        <td
                          className="border w-2/6 font-semibold"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Insp. Bryan
                        </td>
                        <td
                          className="font-bold border uppercase tracking-wider w-1/6"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Fecha Inspección:
                        </td>
                        <td
                          className="border w-2/6"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          2026-09-17
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="font-bold border uppercase tracking-wider"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Hora Inicio:
                        </td>
                        <td
                          className="border font-mono"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          08:00 a.m.
                        </td>
                        <td
                          className="font-bold border uppercase tracking-wider"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Hora Término:
                        </td>
                        <td
                          className="border font-mono"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          11:21 a.m.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. SECCIÓN II: CONTROL DEL PRODUCTO Y COMBO DE ARMADO */}
                <div className="mb-3.5">
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider flex items-center justify-between"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                      textAlign: form.alignSectionTitles,
                    }}
                  >
                    <span>{form.section2Title}</span>
                    <span className="text-[10px] font-mono opacity-80">ERP ORACLE SYNC</span>
                  </div>

                  <table
                    className="w-full border-collapse text-xs"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}` }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="font-bold border uppercase tracking-wider w-1/6"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Clave / SKU:
                        </td>
                        <td
                          className="border w-2/6 font-mono font-black"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          C0557-01
                        </td>
                        <td
                          className="font-bold border uppercase tracking-wider w-1/6"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Lote Total (N):
                        </td>
                        <td
                          className="border w-2/6 font-mono font-bold"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          900 pzas
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="font-bold border uppercase tracking-wider"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Descripción:
                        </td>
                        <td
                          colSpan={3}
                          className="border font-bold uppercase"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            fontSize: `${form.fontSizeCellValues}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          JADE CHEF 10 PZAS MAS SET DE 5 CUCHILLOS TIPO MADERA
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="font-bold border uppercase tracking-wider"
                          style={{
                            backgroundColor: form.cellLabelBgColor,
                            color: form.cellLabelTextColor,
                            borderColor: form.tableBorderColor,
                            fontSize: `${form.fontSizeCellLabels}px`,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          Componentes Combo:
                        </td>
                        <td
                          colSpan={3}
                          className="border text-[11px]"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            padding: `${padV}px ${padH}px`,
                          }}
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                              <strong>C0557-00:</strong> JADE CHEF 10 PZAS (1 pieza)
                            </span>
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                              <strong>C0558-00:</strong> SET DE 5 CUCHILLOS TIPO MADERA (1 pieza)
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. SECCIÓN III: MUESTREO DE ACEPTACIÓN (AQL) */}
                <div className="mb-3.5">
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                    }}
                  >
                    <span>{form.section3Title}</span>
                  </div>

                  <table
                    className="w-full border-collapse text-xs text-center"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}` }}
                  >
                    <thead>
                      <tr
                        className="font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.cellLabelTextColor,
                          fontSize: `${form.fontSizeTableHeaders}px`,
                        }}
                      >
                        <th className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>Nivel</th>
                        <th className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>AQL Target</th>
                        <th className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>Letra</th>
                        <th className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>Muestra Req. (n)</th>
                        <th className="border p-1.5 bg-emerald-50 text-emerald-900" style={{ borderColor: form.tableBorderColor }}>Aceptación (Ac)</th>
                        <th className="border p-1.5 bg-red-50 text-red-900" style={{ borderColor: form.tableBorderColor }}>Rechazo (Re)</th>
                        <th className="border p-1.5 bg-amber-50" style={{ borderColor: form.tableBorderColor }}>Inspeccionada</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-semibold">
                        <td className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>General II</td>
                        <td className="border p-1.5" style={{ borderColor: form.tableBorderColor }}>1.5%</td>
                        <td className="border p-1.5 font-bold font-mono text-indigo-700" style={{ borderColor: form.tableBorderColor }}>J</td>
                        <td className="border p-1.5 font-mono font-bold" style={{ borderColor: form.tableBorderColor }}>80 pz</td>
                        <td className="border p-1.5 font-mono font-bold text-emerald-800 bg-emerald-50/50" style={{ borderColor: form.tableBorderColor }}>≤ 3</td>
                        <td className="border p-1.5 font-mono font-bold text-red-800 bg-red-50/50" style={{ borderColor: form.tableBorderColor }}>≥ 4</td>
                        <td className="border p-1.5 font-mono font-black bg-amber-50/70" style={{ borderColor: form.tableBorderColor }}>80 pz</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. SECCIÓN IV: CLASIFICACIÓN DE DEFECTOS FÍSICOS Y FUNCIONALES (CON PADDING E INTERLINEADO MEJORADO) */}
                <div className="mb-3.5">
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider flex items-center justify-between"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                    }}
                  >
                    <span>{form.section4Title}</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      CRÍTICOS: 1 | MAYORES: 2 | MENORES: 0
                    </span>
                  </div>

                  <table
                    className="w-full border-collapse text-xs"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}` }}
                  >
                    <thead>
                      <tr
                        className="font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: form.cellLabelBgColor,
                          color: form.cellLabelTextColor,
                          fontSize: `${form.fontSizeTableHeaders}px`,
                        }}
                      >
                        <th className="border text-left w-1/5" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Categoría</th>
                        <th className="border text-left w-2/5" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Criterio Evaluado</th>
                        <th className="border text-center w-16" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Severidad</th>
                        <th className="border text-center w-12" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Def</th>
                        <th className="border text-center w-24" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Resultado</th>
                        <th className="border text-left" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: form.tableBorderColor }}>
                      {/* Fila 1 */}
                      <tr>
                        <td
                          className="border font-bold align-top bg-slate-50"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellLabelTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                          }}
                        >
                          Empaque y Cajas
                        </td>
                        <td
                          className="border align-top"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                            wordBreak: 'break-word',
                          }}
                        >
                          <div className="font-bold" style={{ fontSize: `${form.fontSizeCellValues}px` }}>
                            Caja Máster / Empaque Primario sin Daños ni Humedad
                          </div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Cajas sin aplastamientos, roturas, manchas o humedad que comprometan la protección del producto.
                          </div>
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[9px]">Mayor</span>
                        </td>
                        <td className="border text-center font-bold font-mono text-red-600 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          1
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="text-red-700 font-black text-[10px]">✗ DESVIACIÓN</span>
                        </td>
                        <td className="border text-[10px] text-slate-600 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px`, lineHeight: lineH }}>
                          Cajas sin aplastamientos ni roturas.
                        </td>
                      </tr>

                      {/* Fila 2 */}
                      <tr>
                        <td
                          className="border font-bold align-top bg-slate-50"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellLabelTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                          }}
                        >
                          Etiquetado y Códigos
                        </td>
                        <td
                          className="border align-top"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                            wordBreak: 'break-word',
                          }}
                        >
                          <div className="font-bold" style={{ fontSize: `${form.fontSizeCellValues}px` }}>
                            Código de Barras EAN / UPC Legible y Escaneable
                          </div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Código de barras de la clave o kit correcto, sin borrones ni errores de lectura scanner.
                          </div>
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="bg-red-100 text-red-900 font-bold px-1.5 py-0.5 rounded text-[9px]">Crítico</span>
                        </td>
                        <td className="border text-center font-bold font-mono text-red-600 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          1
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="text-red-700 font-black text-[10px]">✗ DESVIACIÓN</span>
                        </td>
                        <td className="border text-[10px] text-slate-600 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px`, lineHeight: lineH }}>
                          Código de barras con borrón leve.
                        </td>
                      </tr>

                      {/* Fila 3 Conforme */}
                      <tr>
                        <td
                          className="border font-bold align-top bg-slate-50"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellLabelTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                          }}
                        >
                          Armado y Componentes
                        </td>
                        <td
                          className="border align-top"
                          style={{
                            borderColor: form.tableBorderColor,
                            color: form.cellValueTextColor,
                            padding: `${padV}px ${padH}px`,
                            lineHeight: lineH,
                            wordBreak: 'break-word',
                          }}
                        >
                          <div className="font-bold" style={{ fontSize: `${form.fontSizeCellValues}px` }}>
                            Integridad del Combo (Componentes y Claves Base Correctas)
                          </div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Comprobar que no falten sartenes, tapas, mangos, cuchillos, accesorios ni instructivos del combo.
                          </div>
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="bg-red-100 text-red-900 font-bold px-1.5 py-0.5 rounded text-[9px]">Crítico</span>
                        </td>
                        <td className="border text-center font-bold font-mono text-slate-700 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          0
                        </td>
                        <td className="border text-center align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px` }}>
                          <span className="text-emerald-700 font-bold text-[10px]">✓ CONFORME</span>
                        </td>
                        <td className="border text-[10px] text-slate-600 align-top" style={{ borderColor: form.tableBorderColor, padding: `${padV}px ${padH}px`, lineHeight: lineH }}>
                          Conforme / Sin hallazgos
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6. SECCIÓN VI: DICTAMEN FINAL Y DISPOSICIÓN */}
                <div className="mb-3.5">
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider flex items-center justify-between"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                    }}
                  >
                    <span>{form.section6Title}</span>
                  </div>

                  <div
                    className="p-2.5 border space-y-2 bg-white"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs">DICTAMEN:</span>
                        <span className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded shadow">
                          RECHAZADO
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          [ ] APROBADO &nbsp; [X] RECHAZADO &nbsp; [ ] CONDICIONADO
                        </span>
                      </div>
                      <div className="font-bold text-[11px] bg-red-100 text-red-900 px-2 py-0.5 border border-red-300">
                        ETIQUETA: ROJA
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded p-1.5 text-[10px] text-slate-500">
                      <strong>OBSERVACIONES TÉCNICAS:</strong> Se detectaron desviaciones en empaque y código de barras. Requiere retrabajo y re-inspección.
                    </div>
                  </div>
                </div>

                {/* 7. SECCIÓN VII: FIRMAS DE CONFORMIDAD Y APROBACIÓN */}
                <div>
                  <div
                    className="font-bold px-3 py-1.5 uppercase tracking-wider"
                    style={{
                      backgroundColor: form.sectionHeaderBgColor,
                      color: form.sectionHeaderTextColor,
                      fontSize: `${form.fontSizeSectionTitles}px`,
                      fontFamily: activeTitleFontCss,
                      border: `${bWidth}px solid ${form.tableBorderColor}`,
                    }}
                  >
                    <span>{form.section7Title}</span>
                  </div>

                  <div
                    className="grid grid-cols-2 divide-x border bg-white"
                    style={{ border: `${bWidth}px solid ${form.tableBorderColor}`, borderColor: form.tableBorderColor }}
                  >
                    <div className="p-3 text-center flex flex-col justify-between h-24">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">1. Inspección y Liberación de Calidad</span>
                      <div className="font-serif italic text-lg text-slate-800 font-black">Insp. Bryan</div>
                      <span className="text-[9px] text-slate-400">Firma Digital Registrada</span>
                    </div>

                    <div className="p-3 text-center flex flex-col justify-between h-24" style={{ borderColor: form.tableBorderColor }}>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">2. Conformidad y Aprobación de Maquila</span>
                      <div className="font-serif italic text-lg text-slate-800 font-black">Supervisor de Maquila</div>
                      <span className="text-[9px] text-slate-400">Firma Digital Registrada</span>
                    </div>
                  </div>
                </div>

                {/* Pie de página normativo */}
                <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{form.documentCode}, v{form.version}. Documento normativo Suave y Fácil S.A. de C.V.</span>
                  <span>Página 1 de 1 (Carta 8.5" x 11")</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        itemType={confirmModal.itemType}
        itemName={confirmModal.itemName}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
