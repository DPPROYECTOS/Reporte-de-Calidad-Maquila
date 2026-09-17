import React, { useState, useEffect, useRef } from 'react';
import {
  QualityReport,
  DefectCheckItem,
  LotStatus,
  AQLTarget,
  InspectionLevel,
} from '../types/qualityReport';
import { calculateAQLPlan } from '../utils/aqlTable';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Sparkles,
  Calculator,
  Building,
  UserCheck,
  Tag,
  Clock,
  ShieldCheck,
  Archive,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Palette,
  Upload,
} from 'lucide-react';
import { PRODUCT_CATALOG } from '../data/productCatalog';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import { getStoredInspectors } from '../utils/appConfigStore';

interface ExcelGridReportProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onOpenPhotosModal: () => void;
  onOpenAqlModal: () => void;
  onOpenAiAssist: () => void;
  zoomLevel?: number;
  setZoomLevel?: React.Dispatch<React.SetStateAction<number>>;
  isAutoFit?: boolean;
  setIsAutoFit?: React.Dispatch<React.SetStateAction<boolean>>;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitWidth?: () => void;
  onResetZoom?: () => void;
  templateConfig?: SheetTemplateConfig;
  onOpenTemplateConfig?: () => void;
}

export const ExcelGridReport: React.FC<ExcelGridReportProps> = ({
  report,
  onUpdateReport,
  onOpenPhotosModal,
  onOpenAqlModal,
  onOpenAiAssist,
  zoomLevel: propZoomLevel,
  setZoomLevel: propSetZoomLevel,
  isAutoFit: propIsAutoFit,
  setIsAutoFit: propSetIsAutoFit,
  onZoomIn: propOnZoomIn,
  onZoomOut: propOnZoomOut,
  onFitWidth: propOnFitWidth,
  onResetZoom: propOnResetZoom,
  templateConfig,
  onOpenTemplateConfig,
}) => {
  const cfg = templateConfig || DEFAULT_TEMPLATE_CONFIG;

  // Font family helper
  const getFontFamily = (family?: string) => {
    switch (family) {
      case 'serif':
        return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
      case 'georgia':
        return 'Georgia, Cambria, "Times New Roman", Times, serif';
      case 'mono':
        return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      case 'arial':
        return 'Arial, "Helvetica Neue", Helvetica, sans-serif';
      case 'trebuchet':
        return '"Trebuchet MS", "Lucida Sans Unicode", Arial, sans-serif';
      case 'sans':
      default:
        return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    }
  };

  const docFontFamily = getFontFamily(cfg.fontFamilyGeneral);
  const titleFontFamily = getFontFamily(cfg.fontFamilyTitles || 'serif');

  // Resolved Colors
  const sHeaderBg = cfg.sectionHeaderBgColor || cfg.headerBgColor || '#1A1A1A';
  const sHeaderText = cfg.sectionHeaderTextColor || cfg.headerTextColor || '#FFFFFF';
  const cellLabelBg = cfg.cellLabelBgColor || cfg.cellHeaderBgColor || '#F3F4F6';
  const cellLabelText = cfg.cellLabelTextColor || cfg.cellHeaderTextColor || '#1F2937';
  const cellValText = cfg.cellValueTextColor || '#111827';
  const tableBorder = cfg.tableBorderColor || '#1A1A1A';
  const metaBg = cfg.metadataBgColor || '#FAF9F6';
  const titleText = cfg.titleTextColor || '#111827';
  const subtitleText = cfg.subtitleTextColor || '#6B7280';
  const procRefText = cfg.procedureRefTextColor || '#4B5563';
  const metaLabelText = cfg.metadataLabelTextColor || '#374151';
  const metaValText = cfg.metadataValueTextColor || '#111827';
  const tableSubHeaderBg = cfg.tableSubHeaderBgColor || '#F3F4F6';
  const tableSubHeaderText = cfg.tableSubHeaderTextColor || '#374151';

  // Resolved Font Sizes
  const szReportTitle = cfg.fontSizeReportTitle || 18;
  const szHeaderSubtitle = cfg.fontSizeHeaderSubtitle || 9;
  const szProcedureRef = cfg.fontSizeProcedureRef || 9;
  const szSectionTitles = cfg.fontSizeSectionTitles || 13;
  const szCellLabels = cfg.fontSizeCellLabels || 10;
  const szCellValues = cfg.fontSizeCellValues || 12;
  const szMetaLabels = cfg.fontSizeMetadataLabels || 9;
  const szMetaValues = cfg.fontSizeMetadataValues || 10;
  const szTableHeaders = cfg.fontSizeTableHeaders || 10;
  const szFooterNote = cfg.fontSizeFooterNote || 9;
  const logoHeight = cfg.logoHeight || 48;

  // Lista dinámica de inspectores desde Supabase / Store
  const [inspectorsList, setInspectorsList] = useState<string[]>(() => getStoredInspectors());

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<string[]>) => {
      if (e.detail && Array.isArray(e.detail)) {
        setInspectorsList(e.detail);
      } else {
        setInspectorsList(getStoredInspectors());
      }
    };
    window.addEventListener('quality-inspectors-updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('quality-inspectors-updated', handleUpdate as EventListener);
    };
  }, []);

  // Field Update Handler
  const handleChange = (field: keyof QualityReport, value: any) => {
    const updated = { ...report, [field]: value, updatedAt: new Date().toISOString() };

    // Auto recalculate AQL if totalLotSize changes
    if (field === 'totalLotSize') {
      const lot = parseInt(value) || 0;
      const plan = calculateAQLPlan(lot, report.inspectionLevel, report.aqlTarget);
      updated.codeLetter = plan.codeLetter;
      updated.sampleSizeRequired = plan.sampleSize;
      updated.sampleSizeInspected = plan.sampleSize;
      updated.acLimit = plan.ac;
      updated.reLimit = plan.re;
    }

    // Auto evaluate status when defect total changes
    onUpdateReport(reEvaluateDisposition(updated));
  };

  // SKU change with auto catalog matching
  const handleSkuChange = (skuVal: string) => {
    const matched = PRODUCT_CATALOG.find(
      (item) => item.sku.toUpperCase() === skuVal.trim().toUpperCase()
    );
    if (matched) {
      const compItems = matched.componentes
        ? matched.componentes.map((c) => ({
            sku: c.sku,
            descripcion: c.desc,
            cantidad: c.cantidad,
            unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
          }))
        : report.componentesArmado;

      const compStr = compItems && compItems.length > 0
        ? compItems.map((c) => c.sku).join('/')
        : report.claveCompuesta;

      const updated = {
        ...report,
        skuArmado: matched.sku,
        descripcionArmado: matched.desc,
        claveCompuesta: compStr,
        componentesArmado: compItems,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(reEvaluateDisposition(updated));
    } else {
      handleChange('skuArmado', skuVal);
    }
  };

  // Defect item counter change
  const handleDefectCountChange = (itemId: string, newCount: number) => {
    const safeCount = Math.max(0, newCount);
    const updatedItems = report.defectItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          defectsFound: safeCount,
          passed: safeCount === 0,
        };
      }
      return item;
    });

    const updated = {
      ...report,
      defectItems: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    onUpdateReport(reEvaluateDisposition(updated));
  };

  const handleDefectDescriptionChange = (itemId: string, desc: string) => {
    const updatedItems = report.defectItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, description: desc };
      }
      return item;
    });

    onUpdateReport({ ...report, defectItems: updatedItems });
  };

  // Re-evaluate lot status based on AQL limits and defects
  const reEvaluateDisposition = (rep: QualityReport): QualityReport => {
    let totalCrit = 0;
    let totalMaj = 0;
    let totalMin = 0;

    rep.defectItems.forEach((item) => {
      if (item.severity === 'Critico') totalCrit += item.defectsFound;
      if (item.severity === 'Mayor') totalMaj += item.defectsFound;
      if (item.severity === 'Menor') totalMin += item.defectsFound;
    });

    const totalDef = totalCrit + totalMaj + totalMin;
    const rate = rep.sampleSizeInspected > 0 ? (totalDef / rep.sampleSizeInspected) * 100 : 0;

    let newStatus: LotStatus = 'APROBADO';
    let tagColor: 'Verde' | 'Roja' | 'Amarilla' = 'Verde';
    let cuarentena = false;

    if (totalCrit > 0 || totalDef >= rep.reLimit) {
      newStatus = 'RECHAZADO';
      tagColor = 'Roja';
      cuarentena = true;
    } else if (totalDef > rep.acLimit) {
      newStatus = 'CONDICIONADO';
      tagColor = 'Amarilla';
    }

    return {
      ...rep,
      totalCritical: totalCrit,
      totalMajor: totalMaj,
      totalMinor: totalMin,
      totalDefectives: totalDef,
      defectRatePercentage: rate,
      status: newStatus,
      tagColor: tagColor,
      cuarentenaMoved: cuarentena,
    };
  };

  const isApproved = report.status === 'APROBADO';
  const isRejected = report.status === 'RECHAZADO';

  // Zoom state for zooming in/out on the report view
  const [internalZoomLevel, setInternalZoomLevel] = useState<number>(1.0);
  const [internalIsAutoFit, setInternalIsAutoFit] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const zoomLevel = propZoomLevel !== undefined ? propZoomLevel : internalZoomLevel;
  const setZoomLevel = propSetZoomLevel || setInternalZoomLevel;
  const isAutoFit = propIsAutoFit !== undefined ? propIsAutoFit : internalIsAutoFit;
  const setIsAutoFit = propSetIsAutoFit || setInternalIsAutoFit;

  // Auto-fit function based on available width
  const calculateFitZoom = () => {
    if (typeof window === 'undefined') return 1.0;
    const padding = window.innerWidth < 640 ? 20 : 48;
    // Standard letter paper width is ~820px
    const targetWidth = 820;
    const available = window.innerWidth - padding;
    const fit = Math.min(1.0, Math.max(0.35, Math.round((available / targetWidth) * 100) / 100));
    return fit;
  };

  const handleFitWidth = propOnFitWidth || (() => {
    const fit = calculateFitZoom();
    setZoomLevel(fit);
    setIsAutoFit(true);
  });

  const handleZoomIn = propOnZoomIn || (() => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10));
  });

  const handleZoomOut = propOnZoomOut || (() => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.max(0.35, Math.round((prev - 0.1) * 10) / 10));
  });

  const handleResetZoom = propOnResetZoom || (() => {
    setIsAutoFit(false);
    setZoomLevel(1.0);
  });

  // Initial check: if screen width is smaller than 860px, auto-fit by default
  useEffect(() => {
    if (window.innerWidth < 860) {
      handleFitWidth();
    }
  }, []);

  // Recalculate on window resize if auto-fit is active
  useEffect(() => {
    const handleResize = () => {
      if (isAutoFit) {
        const fit = calculateFitZoom();
        setZoomLevel(fit);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoFit]);

  // Ctrl + Mouse Wheel zoom
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setIsAutoFit(false);
        setZoomLevel((prev) => {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          return Math.min(1.6, Math.max(0.35, Math.round((prev + delta) * 100) / 100));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleToggleFitOrReset = () => {
    if (isAutoFit || Math.round(zoomLevel * 100) !== 100) {
      handleResetZoom();
    } else {
      handleFitWidth();
    }
  };

  // Resuelve los componentes del combo de forma estructurada para acomodo ordenado
  const resolvedComponents = (() => {
    if (report.componentesArmado && report.componentesArmado.length > 0) {
      return report.componentesArmado;
    }
    const matched = PRODUCT_CATALOG.find(
      (item) => item.sku.toUpperCase() === (report.skuArmado || '').trim().toUpperCase()
    );
    if (matched?.componentes && matched.componentes.length > 0) {
      return matched.componentes.map((c) => ({
        sku: c.sku,
        descripcion: c.desc,
        cantidad: c.cantidad,
        unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
      }));
    }
    if (report.claveCompuesta) {
      const parts = report.claveCompuesta.split('/').map((p) => p.trim()).filter(Boolean);
      return parts.map((sku) => {
        const itemMatch = PRODUCT_CATALOG.find((cat) => cat.sku.toUpperCase() === sku.toUpperCase());
        return {
          sku,
          descripcion: itemMatch?.desc || 'Componente individual de combo',
          cantidad: 1,
          unidad: 'pieza',
        };
      });
    }
    return [];
  })();

  return (
    <div
      ref={wrapperRef}
      className="letter-page-wrapper w-full min-h-screen overflow-x-auto overflow-y-auto bg-[#FAF9F6] p-2 sm:p-6"
    >
      {/* CONTENEDOR ESCALABLE DE LA HOJA DE REPORTE (Garantiza inicio en x=0 para que la barra horizontal muestre todo sin cortes) */}
      <div className="w-fit min-w-full flex justify-center items-start py-1 transition-all duration-150">
        {/* 
          TAMAÑO CARTA EXCEL SHEET CANVAS
          Width: 816px (215.9mm - 8.5 inches Letter width)
        */}
        <div
          className="letter-paper bg-white w-[816px] max-w-[816px] min-h-[279.4mm] p-4 sm:p-6 shadow-xl border-2 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:min-w-0 print:m-0 origin-top shrink-0 mx-auto"
          style={{
            zoom: zoomLevel,
            borderColor: tableBorder,
            fontFamily: docFontFamily,
            color: cellValText,
          }}
        >
        
        {/* ==========================================
            EXCEL HEADER BLOCK (PERSONALIZADO Y NORMATIVO)
           ========================================== */}
        <div className="border-2 bg-white mb-5 relative group" style={{ borderColor: tableBorder }}>
          <div className="grid grid-cols-12 divide-x-2 divide-y-2 text-center" style={{ borderColor: tableBorder }}>
            {/* Logo de la Empresa (Subido por el usuario) */}
            <div
              onClick={onOpenTemplateConfig}
              className={`col-span-3 p-2.5 flex flex-col items-center justify-center bg-white transition relative group/logo ${
                onOpenTemplateConfig ? 'cursor-pointer hover:bg-indigo-50/40' : ''
              }`}
              title={onOpenTemplateConfig ? 'Haz clic para cambiar el logotipo y colores del formato' : undefined}
            >
              {cfg.logoImageUrl ? (
                <div className="flex flex-col items-center justify-center w-full">
                  <img
                    src={cfg.logoImageUrl}
                    alt="Logo Empresa"
                    style={{ maxHeight: `${logoHeight}px` }}
                    className="max-w-full object-contain mb-1 transition-all"
                  />
                  {cfg.logoSubtitle && (
                    <span
                      className="font-bold uppercase tracking-widest text-center mt-0.5"
                      style={{ fontSize: `${szHeaderSubtitle}px`, color: subtitleText }}
                    >
                      {cfg.logoSubtitle}
                    </span>
                  )}
                  {onOpenTemplateConfig && (
                    <span className="no-print opacity-0 group-hover/logo:opacity-100 transition text-[9px] text-indigo-600 font-bold flex items-center space-x-1 mt-1">
                      <Palette className="w-2.5 h-2.5" />
                      <span>Cambiar Logo</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-2">
                  {onOpenTemplateConfig ? (
                    <button
                      type="button"
                      onClick={onOpenTemplateConfig}
                      className="no-print border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-xl p-3 text-center w-full flex flex-col items-center justify-center group/btn transition bg-slate-50/70 hover:bg-indigo-50 cursor-pointer"
                      title="Haz clic para subir una imagen como logotipo"
                    >
                      <Upload className="w-4 h-4 text-indigo-600 mb-1 group-hover/btn:scale-110 transition" />
                      <span className="text-[10px] font-bold text-slate-700 group-hover/btn:text-indigo-800">
                        Subir Imagen de Logo
                      </span>
                      <span className="text-[8px] text-slate-400">PNG / JPG / SVG</span>
                    </button>
                  ) : (
                    <div className="text-[10px] font-mono text-slate-400 italic">[Espacio Logotipo]</div>
                  )}
                  {cfg.logoSubtitle && (
                    <span
                      className="font-bold uppercase tracking-widest text-center mt-1"
                      style={{ fontSize: `${szHeaderSubtitle}px`, color: subtitleText }}
                    >
                      {cfg.logoSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Title Block */}
            <div className="col-span-6 p-3 flex flex-col justify-center text-center" style={{ backgroundColor: metaBg }}>
              <span
                className="font-bold uppercase tracking-[0.2em]"
                style={{ fontSize: `${szHeaderSubtitle}px`, color: subtitleText }}
              >
                {cfg.headerSubtitle}
              </span>
              <h1
                className="font-black uppercase tracking-tight leading-tight my-0.5"
                style={{
                  fontSize: `${szReportTitle}px`,
                  color: titleText,
                  fontFamily: titleFontFamily,
                }}
              >
                {cfg.reportTitle}
              </h1>
              <span
                className="font-medium italic"
                style={{
                  fontSize: `${szProcedureRef}px`,
                  color: procRefText,
                }}
              >
                {cfg.procedureReference}
              </span>
            </div>

            {/* Metadata Table */}
            <div
              className="col-span-3 text-[10px] font-mono grid grid-cols-2 divide-x divide-y"
              style={{ backgroundColor: metaBg, borderColor: tableBorder }}
            >
              <div
                className="p-1 font-bold flex items-center"
                style={{
                  backgroundColor: cellLabelBg,
                  color: metaLabelText,
                  fontSize: `${szMetaLabels}px`,
                  borderColor: tableBorder,
                }}
              >
                CÓDIGO:
              </div>
              <div
                className="p-1 font-bold bg-white flex items-center justify-center"
                style={{ color: metaValText, borderColor: tableBorder }}
              >
                <input
                  type="text"
                  value={report.folioCode || cfg.documentCode}
                  onChange={(e) => handleChange('folioCode', e.target.value)}
                  style={{ fontSize: `${szMetaValues}px`, color: metaValText }}
                  className="w-full text-center bg-transparent border-none font-bold p-0 focus:outline-none"
                />
              </div>

              <div
                className="p-1 font-bold flex items-center"
                style={{
                  backgroundColor: cellLabelBg,
                  color: metaLabelText,
                  fontSize: `${szMetaLabels}px`,
                  borderColor: tableBorder,
                }}
              >
                VERSIÓN:
              </div>
              <div
                className="p-1 font-bold bg-white flex items-center justify-center"
                style={{ fontSize: `${szMetaValues}px`, color: metaValText, borderColor: tableBorder }}
              >
                {report.version || cfg.version}
              </div>

              <div
                className="p-1 font-bold flex items-center"
                style={{
                  backgroundColor: cellLabelBg,
                  color: metaLabelText,
                  fontSize: `${szMetaLabels}px`,
                  borderColor: tableBorder,
                }}
              >
                REVISIÓN:
              </div>
              <div
                className="p-1 bg-white flex items-center justify-center"
                style={{ fontSize: `${szMetaValues}px`, color: metaValText, borderColor: tableBorder }}
              >
                {report.revisionDate || cfg.revisionDate}
              </div>

              <div
                className="p-1 font-bold flex items-center"
                style={{
                  backgroundColor: cellLabelBg,
                  color: metaLabelText,
                  fontSize: `${szMetaLabels}px`,
                  borderColor: tableBorder,
                }}
              >
                FOLIO/OT:
              </div>
              <div
                className="p-1 font-black text-white flex items-center justify-center"
                style={{ backgroundColor: sHeaderBg, borderColor: tableBorder }}
              >
                <input
                  type="text"
                  value={report.folioOT}
                  onChange={(e) => handleChange('folioOT', e.target.value)}
                  style={{ fontSize: `${szMetaValues}px` }}
                  className="w-full text-center bg-transparent border-none font-black p-0 focus:outline-none text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            SECCIÓN I: DATOS GENERALES
           ========================================== */}
        <div className="mb-5">
          <div
            className="font-bold px-3 py-1.5 uppercase tracking-[0.15em] flex items-center justify-between border"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section1Title}</span>
            <span className="font-sans tracking-widest uppercase opacity-80" style={{ fontSize: `${Math.max(szSectionTitles - 4, 8)}px` }}>
              {cfg.documentCode}
            </span>
          </div>

          <table className="w-full border-collapse border text-xs" style={{ borderColor: tableBorder }}>
            <tbody>
              <tr>
                <td
                  className="font-bold px-2 py-1.5 border w-1/6 uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Inspector:
                </td>
                <td className="p-1 border w-2/6 bg-amber-50/40" style={{ borderColor: tableBorder }}>
                  <input
                    type="text"
                    list="inspectors-datalist"
                    value={report.inspectorName}
                    onChange={(e) => handleChange('inspectorName', e.target.value)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-semibold focus:outline-emerald-600"
                    placeholder="Selecciona o escribe el inspector..."
                  />
                  <datalist id="inspectors-datalist">
                    {inspectorsList.map((insp) => (
                      <option key={insp} value={insp} />
                    ))}
                  </datalist>
                </td>
                <td
                  className="font-bold px-2 py-1.5 border w-1/6 uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Fecha Inspección:
                </td>
                <td className="p-1 border w-2/6" style={{ borderColor: tableBorder }}>
                  <input
                    type="date"
                    value={report.inspectionDate}
                    onChange={(e) => handleChange('inspectionDate', e.target.value)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-mono focus:outline-emerald-600"
                  />
                </td>
              </tr>

              <tr>
                <td
                  className="font-bold px-2 py-1.5 border uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Hora Inicio:
                </td>
                <td className="p-1 border" style={{ borderColor: tableBorder }}>
                  <input
                    type="time"
                    value={report.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-mono focus:outline-emerald-600"
                  />
                </td>
                <td
                  className="font-bold px-2 py-1.5 border uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Hora Término:
                </td>
                <td className="p-1 border" style={{ borderColor: tableBorder }}>
                  <input
                    type="time"
                    value={report.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-mono focus:outline-emerald-600"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ==========================================
            SECCIÓN II: DATOS DE CONTROL Y PRODUCTO
           ========================================== */}
        <div className="mb-5">
          <div
            className="font-bold px-3 py-1.5 uppercase tracking-[0.15em] border flex items-center justify-between"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section2Title}</span>
            <span className="font-sans tracking-widest uppercase opacity-80" style={{ fontSize: `${Math.max(szSectionTitles - 4, 8)}px` }}>
              ERP Oracle Sync
            </span>
          </div>

          <table className="w-full border-collapse border text-xs" style={{ borderColor: tableBorder }}>
            <tbody>
              {/* FILA 1: SKU PRINCIPAL Y LOTE TOTAL */}
              <tr>
                <td
                  className="font-bold px-2 py-1.5 border w-1/6 uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Clave / SKU:
                </td>
                <td className="p-1 border w-2/6 font-mono font-bold bg-amber-50/50" style={{ borderColor: tableBorder }}>
                  <input
                    type="text"
                    list="sku-catalog-list"
                    value={report.skuArmado}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="Escribe C0..."
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-mono font-bold focus:outline-emerald-600 uppercase"
                  />
                  <datalist id="sku-catalog-list">
                    {PRODUCT_CATALOG.map((item) => (
                      <option key={item.sku} value={item.sku}>
                        {item.desc}
                      </option>
                    ))}
                  </datalist>
                </td>
                <td
                  className="font-bold px-2 py-1.5 border w-1/6 uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Lote Total (N):
                </td>
                <td className="p-1 border w-2/6 bg-emerald-50/40" style={{ borderColor: tableBorder }}>
                  <div className="flex items-center justify-between gap-1.5 px-1">
                    <input
                      type="number"
                      value={report.totalLotSize}
                      onChange={(e) => handleChange('totalLotSize', e.target.value)}
                      style={{ fontSize: `${Math.max(szCellValues + 2, 14)}px` }}
                      className="w-24 bg-transparent py-0.5 font-mono font-black text-emerald-950 focus:outline-emerald-600"
                    />
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Piezas Maquiladas</span>
                  </div>
                </td>
              </tr>

              {/* FILA 2: DESCRIPCIÓN DEL ARMADO Y CONFIGURACIÓN DE TARIMAS */}
              <tr>
                <td
                  className="font-bold px-2 py-1.5 border uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Descripción:
                </td>
                <td className="p-1 border bg-white" style={{ borderColor: tableBorder }}>
                  <input
                    type="text"
                    value={report.descripcionArmado}
                    onChange={(e) => handleChange('descripcionArmado', e.target.value)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full bg-transparent px-1 py-0.5 font-medium focus:outline-emerald-600"
                    placeholder="Descripción del producto armado..."
                  />
                </td>
                <td
                  className="font-bold px-2 py-1.5 border uppercase tracking-wider"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  Tarimas / Config:
                </td>
                <td className="p-1 border font-mono bg-white" style={{ borderColor: tableBorder }}>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      value={report.totalTarimas}
                      onChange={(e) => handleChange('totalTarimas', parseInt(e.target.value) || 0)}
                      style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                      className="w-14 bg-neutral-50 border border-neutral-300 rounded-none px-1.5 py-0.5 text-center font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">tarimas @</span>
                    <input
                      type="number"
                      value={report.piezasPorTarima}
                      onChange={(e) => handleChange('piezasPorTarima', parseInt(e.target.value) || 0)}
                      style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                      className="w-16 bg-neutral-50 border border-neutral-300 rounded-none px-1.5 py-0.5 text-center font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">pz/tarima</span>
                  </div>
                </td>
              </tr>

              {/* FILA 3: CLAVES COMPUESTAS E INSUMOS DESGLOSADOS ORDENADAMENTE */}
              <tr>
                <td
                  className="font-bold px-2 py-2 border uppercase tracking-wider align-top"
                  style={{ backgroundColor: cellLabelBg, color: cellLabelText, borderColor: tableBorder, fontSize: `${szCellLabels}px` }}
                >
                  <div className="space-y-1">
                    <div>Claves Compuestas:</div>
                    <div className="text-[9px] font-normal text-neutral-500 normal-case">
                      Desglose de insumos
                    </div>
                  </div>
                </td>
                <td colSpan={3} className="p-2 border bg-white" style={{ borderColor: tableBorder }}>
                  {resolvedComponents.length > 0 ? (
                    <div className="space-y-2">
                      {/* Tabla estructurada y ordenada de componentes */}
                      <table className="w-full border-collapse border text-xs" style={{ borderColor: tableBorder }}>
                        <thead>
                          <tr
                            className="font-bold uppercase tracking-wider"
                            style={{ backgroundColor: tableSubHeaderBg, color: tableSubHeaderText, fontSize: `${szTableHeaders}px` }}
                          >
                            <th className="p-1.5 border text-center w-10" style={{ borderColor: tableBorder }}>#</th>
                            <th className="p-1.5 border text-left w-36" style={{ borderColor: tableBorder }}>Clave / SKU Insumo</th>
                            <th className="p-1.5 border text-left" style={{ borderColor: tableBorder }}>Descripción del Componente</th>
                            <th className="p-1.5 border text-center w-28" style={{ borderColor: tableBorder }}>Cant. por Armado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {resolvedComponents.map((comp, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/30 transition">
                              <td className="p-1.5 border text-center font-mono text-[10px] font-bold text-neutral-500 bg-neutral-50" style={{ borderColor: tableBorder }}>
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border font-mono font-black text-neutral-900 text-[11px] bg-neutral-50/60" style={{ borderColor: tableBorder }}>
                                <span className="bg-neutral-200/80 px-1.5 py-0.5 rounded text-neutral-900 border border-neutral-300">
                                  {comp.sku}
                                </span>
                              </td>
                              <td className="p-1.5 border font-medium text-xs" style={{ borderColor: tableBorder, color: cellValText }}>
                                {comp.descripcion}
                              </td>
                              <td className="p-1.5 border text-center font-mono font-bold" style={{ borderColor: tableBorder }}>
                                {comp.cantidad > 0 ? (
                                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 border border-emerald-300 text-[11px]">
                                    {comp.cantidad} {comp.unidad || (comp.cantidad === 1 ? 'pz' : 'pzas')}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[10px]">1 pz</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Cadena Completa Compuesta ERP */}
                      <div className="flex items-center text-[10px] text-neutral-500 pt-1 border-t border-neutral-200 bg-neutral-50 p-1.5 border" style={{ borderColor: tableBorder }}>
                        <span className="font-bold text-neutral-700 mr-2 shrink-0 uppercase tracking-wider">
                          Cadena Completa ERP:
                        </span>
                        <input
                          type="text"
                          value={report.claveCompuesta}
                          onChange={(e) => handleChange('claveCompuesta', e.target.value)}
                          className="w-full bg-white px-1.5 py-0.5 border border-neutral-300 font-mono text-[10px] text-neutral-800 font-semibold focus:outline-emerald-600 truncate"
                          placeholder="Claves base ej. C0359-00/C0360-00..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={report.claveCompuesta}
                        onChange={(e) => handleChange('claveCompuesta', e.target.value)}
                        style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                        className="w-full bg-transparent px-1 py-1 font-mono focus:outline-emerald-600 border border-neutral-300"
                        placeholder="Escribe claves base compuestas ej. C0359-00/C0360-00..."
                      />
                      <span className="text-[10px] text-neutral-400 italic">
                        Tip: Escribe las claves separadas por barra (/) para que se desglosen de manera automática y ordenada.
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ==========================================
            SECCIÓN III: MUESTREO AQL (ANSI/ASQ Z1.4)
           ========================================== */}
        <div className="mb-5">
          <div
            className="font-bold px-3 py-1.5 uppercase tracking-[0.15em] border flex items-center justify-between"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section3Title}</span>
            <button
              onClick={onOpenAqlModal}
              className="no-print bg-white text-[#1A1A1A] hover:bg-neutral-200 text-[10px] px-2.5 py-0.5 font-bold transition flex items-center space-x-1 uppercase tracking-wider"
            >
              <Calculator className="w-3 h-3" />
              <span>Ver Tabla Anexo 8</span>
            </button>
          </div>

          <table className="w-full border-collapse border text-xs text-center font-mono" style={{ borderColor: tableBorder }}>
            <thead
              className="font-sans uppercase font-bold tracking-wider"
              style={{ backgroundColor: tableSubHeaderBg, color: tableSubHeaderText, fontSize: `${szTableHeaders}px` }}
            >
              <tr>
                <th className="p-1.5 border" style={{ borderColor: tableBorder }}>Nivel Inspección</th>
                <th className="p-1.5 border" style={{ borderColor: tableBorder }}>AQL Target</th>
                <th className="p-1.5 border" style={{ borderColor: tableBorder }}>Letra Código</th>
                <th className="p-1.5 border bg-neutral-200 text-[#1A1A1A]" style={{ borderColor: tableBorder }}>Muestra Requerida (n)</th>
                <th className="p-1.5 border bg-emerald-100 text-emerald-900" style={{ borderColor: tableBorder }}>Aceptación (Ac)</th>
                <th className="p-1.5 border bg-red-100 text-red-900" style={{ borderColor: tableBorder }}>Rechazo (Re)</th>
                <th className="p-1.5 border bg-amber-100 text-amber-900" style={{ borderColor: tableBorder }}>Muestra Inspeccionada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1.5 border font-sans font-medium" style={{ borderColor: tableBorder, color: cellValText, fontSize: `${szCellValues}px` }}>
                  {report.inspectionLevel}
                </td>
                <td className="p-1.5 border font-bold" style={{ borderColor: tableBorder, color: cellValText, fontSize: `${szCellValues}px` }}>
                  {report.aqlTarget}%
                </td>
                <td className="p-1.5 border font-black text-sm bg-neutral-50" style={{ borderColor: tableBorder, color: cellValText }}>
                  {report.codeLetter}
                </td>
                <td className="p-1.5 border font-black bg-neutral-100 text-sm" style={{ borderColor: tableBorder, color: cellValText }}>
                  {report.sampleSizeRequired} pz
                </td>
                <td className="p-1.5 border font-black text-emerald-900 bg-emerald-50 text-sm" style={{ borderColor: tableBorder }}>
                  ≤ {report.acLimit}
                </td>
                <td className="p-1.5 border font-black text-red-900 bg-red-50 text-sm" style={{ borderColor: tableBorder }}>
                  ≥ {report.reLimit}
                </td>
                <td className="p-1.5 border bg-amber-50/60" style={{ borderColor: tableBorder }}>
                  <input
                    type="number"
                    value={report.sampleSizeInspected}
                    onChange={(e) => handleChange('sampleSizeInspected', parseInt(e.target.value) || 0)}
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-16 text-center font-black bg-white border border-neutral-300 py-0.5 focus:outline-emerald-600"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ==========================================
            SECCIÓN IV: CHECKLIST Y MATRIZ DE DEFECTOS (ESPACIOSO PARA LLENADO A MANO)
           ========================================== */}
        <div className="mb-6">
          <div
            className="font-bold px-3.5 py-2 uppercase tracking-[0.15em] border flex items-center justify-between"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section4Title}</span>
            <span className="text-[10px] text-amber-300 font-mono">
              Totales: Críticos ({report.totalCritical}) | Mayores ({report.totalMajor}) | Menores ({report.totalMinor})
            </span>
          </div>

          <table className="w-full border-collapse border-2 text-xs" style={{ borderColor: tableBorder }}>
            <thead
              className="font-bold uppercase tracking-wider"
              style={{ backgroundColor: tableSubHeaderBg, color: tableSubHeaderText, fontSize: `${szTableHeaders}px` }}
            >
              <tr>
                <th className="p-2 border text-left w-1/5" style={{ borderColor: tableBorder }}>Categoría</th>
                <th className="p-2 border text-left w-2/5" style={{ borderColor: tableBorder }}>Criterio de Inspección</th>
                <th className="p-2 border text-center w-20" style={{ borderColor: tableBorder }}>Severidad</th>
                <th className="p-2 border text-center w-20 bg-amber-100 text-amber-950" style={{ borderColor: tableBorder }}>Defectos ($n$)</th>
                <th className="p-2 border text-center w-24" style={{ borderColor: tableBorder }}>Estado</th>
                <th className="p-2 border text-left" style={{ borderColor: tableBorder }}>Observaciones / Hallazgos (Escrito a Mano)</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: tableBorder }}>
              {report.defectItems.map((item) => {
                const hasDefect = item.defectsFound > 0;
                return (
                  <tr
                    key={item.id}
                    className={hasDefect ? 'bg-red-50/70 font-semibold' : 'hover:bg-neutral-50'}
                  >
                    <td
                      className="p-2.5 border font-bold text-neutral-800 bg-[#FAF9F6] text-[11px] align-top"
                      style={{ borderColor: tableBorder, fontSize: `${szCellValues}px` }}
                    >
                      {item.category}
                    </td>

                    <td className="p-2.5 border align-top" style={{ borderColor: tableBorder, color: cellValText }}>
                      <div className="font-bold text-xs" style={{ fontSize: `${szCellValues}px` }}>{item.name}</div>
                      <div className="text-[10px] text-neutral-600 font-normal leading-normal italic mt-0.5">
                        {item.description}
                      </div>
                    </td>

                    <td className="p-2.5 border text-center font-bold align-top" style={{ borderColor: tableBorder }}>
                      <span
                        className={`text-[9px] px-2 py-1 uppercase tracking-wider font-mono border inline-block ${
                          item.severity === 'Critico'
                            ? 'bg-red-200 text-red-950 font-bold border-red-500'
                            : item.severity === 'Mayor'
                            ? 'bg-amber-200 text-amber-950 font-bold border-amber-500'
                            : 'bg-neutral-200 text-neutral-900 border-neutral-400'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td className="p-2.5 border text-center font-mono font-bold bg-amber-50/50 align-top" style={{ borderColor: tableBorder }}>
                      <input
                        type="number"
                        min={0}
                        value={item.defectsFound}
                        onChange={(e) => handleDefectCountChange(item.id, parseInt(e.target.value) || 0)}
                        style={{ fontSize: `${szCellValues}px` }}
                        className={`w-14 h-8 text-center font-mono font-black border-2 focus:outline-emerald-600 ${
                          hasDefect ? 'bg-red-100 text-red-900 border-red-600' : 'bg-white'
                        }`}
                      />
                    </td>

                    <td className="p-2.5 border text-center font-bold align-top" style={{ borderColor: tableBorder }}>
                      <div className="flex flex-col items-center space-y-1">
                        {item.passed ? (
                          <span className="text-emerald-800 font-black text-[11px]">
                            ✓ CUMPLE
                          </span>
                        ) : (
                          <span className="text-red-700 font-black text-[11px]">
                            ✗ DESVIACIÓN
                          </span>
                        )}
                        <span className="text-[9px] text-neutral-500 font-mono hidden print:inline-block">
                          [ ] Ok  [ ] Def
                        </span>
                      </div>
                    </td>

                    <td className="p-2 border align-top bg-white" style={{ borderColor: tableBorder }}>
                      <div className="min-h-[38px] flex items-center">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleDefectDescriptionChange(item.id, e.target.value)}
                          placeholder={hasDefect ? 'Escriba el detalle del hallazgo...' : 'Sin hallazgos / Conforme'}
                          style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                          className="w-full bg-transparent px-1.5 py-1 focus:outline-emerald-600 border-b border-dashed border-neutral-300 print:border-b print:border-solid print:border-neutral-400 font-sans"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ==========================================
            SECCIÓN V: EVIDENCIA FOTOGRÁFICA Y ARCHIVOS .ZIP
           ========================================== */}
        <div className="mb-6">
          <div
            className="font-bold px-3.5 py-2 uppercase tracking-[0.15em] border flex items-center justify-between"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section5Title}</span>
            <button
              onClick={onOpenPhotosModal}
              className="no-print bg-white text-[#1A1A1A] hover:bg-neutral-200 text-[10px] px-3 py-1 font-bold transition flex items-center space-x-1.5 uppercase tracking-wider border"
              style={{ borderColor: tableBorder }}
            >
              <Camera className="w-3.5 h-3.5 text-amber-700" />
              <span>Gestionar Evidencias / Archivo .ZIP</span>
            </button>
          </div>

          <div className="p-3 border-2 bg-[#FAF9F6] space-y-3" style={{ borderColor: tableBorder }}>
            {/* Attached ZIP Banner status in report */}
            {report.zipAttachment && (
              <div className="bg-white border p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono" style={{ borderColor: tableBorder }}>
                <div className="flex items-center space-x-2">
                  <Archive className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>PAQUETE ZIP DE EVIDENCIAS:</strong> {report.zipAttachment.filename} ({(report.zipAttachment.sizeBytes / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <span className="text-neutral-600 text-[10px] bg-emerald-50 px-2 py-0.5 border border-emerald-300 font-bold">
                  {report.zipAttachment.filesCount} fotos adjuntas • {report.zipAttachment.uploadedAt}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              {/* Foto 1 */}
              <div
                className={`p-3 border text-center transition min-h-[75px] flex flex-col justify-between ${
                  report.photoInitial.captured ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-neutral-300'
                }`}
              >
                <div>
                  <div className="font-bold uppercase tracking-wider text-[9px]" style={{ color: cellValText }}>1. Inicio Almacén</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 italic">Recepción insumos</div>
                </div>
                <div className="mt-2 font-bold text-xs">
                  {report.photoInitial.captured || (report.photoInitial.urls && report.photoInitial.urls.length > 0) ? (
                    <span className="text-emerald-800 font-mono">
                      ✓ {report.photoInitial.urls?.length ? `${report.photoInitial.urls.length} foto(s)` : 'Capturada'}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-mono">⚠️ Pendiente</span>
                  )}
                </div>
              </div>

              {/* Foto 2 */}
              <div
                className={`p-3 border text-center transition min-h-[75px] flex flex-col justify-between ${
                  report.photoProcess.captured ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-neutral-300'
                }`}
              >
                <div>
                  <div className="font-bold uppercase tracking-wider text-[9px]" style={{ color: cellValText }}>2. Proceso Módulo</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 italic">Ejecución armado</div>
                </div>
                <div className="mt-2 font-bold text-xs">
                  {report.photoProcess.captured || (report.photoProcess.urls && report.photoProcess.urls.length > 0) ? (
                    <span className="text-emerald-800 font-mono">
                      ✓ {report.photoProcess.urls?.length ? `${report.photoProcess.urls.length} foto(s)` : 'Capturada'}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-mono">⚠️ Pendiente</span>
                  )}
                </div>
              </div>

              {/* Foto 3 */}
              <div
                className={`p-3 border text-center transition min-h-[75px] flex flex-col justify-between ${
                  report.photoReleasedPiece.captured ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-neutral-300'
                }`}
              >
                <div>
                  <div className="font-bold uppercase tracking-wider text-[9px]" style={{ color: cellValText }}>3. Pieza Liberada</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 italic">Detalle calidad</div>
                </div>
                <div className="mt-2 font-bold text-xs">
                  {report.photoReleasedPiece.captured || (report.photoReleasedPiece.urls && report.photoReleasedPiece.urls.length > 0) ? (
                    <span className="text-emerald-800 font-mono">
                      ✓ {report.photoReleasedPiece.urls?.length ? `${report.photoReleasedPiece.urls.length} foto(s)` : 'Capturada'}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-mono">⚠️ Pendiente</span>
                  )}
                </div>
              </div>

              {/* Foto 4 */}
              <div
                className={`p-3 border text-center transition min-h-[75px] flex flex-col justify-between ${
                  report.photoPalletized.captured ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-neutral-300'
                }`}
              >
                <div>
                  <div className="font-bold uppercase tracking-wider text-[9px]" style={{ color: cellValText }}>4. PT Entarimado</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 italic">CVD-AMA-F-03</div>
                </div>
                <div className="mt-2 font-bold text-xs">
                  {report.photoPalletized.captured || (report.photoPalletized.urls && report.photoPalletized.urls.length > 0) ? (
                    <span className="text-emerald-800 font-mono">
                      ✓ {report.photoPalletized.urls?.length ? `${report.photoPalletized.urls.length} foto(s)` : 'Capturada'}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-mono">⚠️ Pendiente</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            SECCIÓN VI: DICTAMEN Y PLAN DE ACCIÓN (LÍNEAS DE ESCRITURA Y CHECKBOXES A MANO)
           ========================================== */}
        <div className="mb-6">
          <div
            className="font-bold px-3.5 py-2 uppercase tracking-[0.15em] border flex items-center justify-between"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section6Title}</span>
          </div>

          <div className="border-2 p-4 bg-white space-y-4" style={{ borderColor: tableBorder }}>
            {/* Disposition Status Badge Row with Printable Checkboxes */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border bg-[#FAF9F6]" style={{ borderColor: tableBorder }}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold uppercase text-[10px] tracking-widest" style={{ color: cellValText }}>Dictamen Estatus:</span>
                <span
                  className={`px-4 py-1.5 text-xs font-black tracking-widest uppercase flex items-center space-x-1.5 ${
                    isApproved
                      ? 'bg-[#1A1A1A] text-white'
                      : isRejected
                      ? 'bg-red-700 text-white'
                      : 'bg-amber-400 text-black'
                  }`}
                >
                  {isApproved && <CheckCircle2 className="w-4 h-4" />}
                  {isRejected && <XCircle className="w-4 h-4" />}
                  <span>{report.status}</span>
                </span>

                {/* Print manual checkboxes */}
                <div className="flex items-center space-x-3 text-xs font-mono border-l border-neutral-300 pl-4">
                  <span className="font-bold text-neutral-800 text-[10px]">Llenado a mano:</span>
                  <span>[{isApproved ? 'X' : ' '}] APROBADO</span>
                  <span>[{isRejected ? 'X' : ' '}] RECHAZADO</span>
                  <span>[{report.status === 'CONDICIONADO' ? 'X' : ' '}] CONDICIONADO</span>
                </div>
              </div>

              {/* Tag & Quarantine Rules */}
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="text-neutral-500 uppercase text-[10px]">Etiqueta:</span>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-black border uppercase tracking-wider ${
                      report.tagColor === 'Verde'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                        : report.tagColor === 'Roja'
                        ? 'bg-red-100 text-red-900 border-red-400'
                        : 'bg-amber-100 text-amber-900 border-amber-400'
                    }`}
                  >
                    Etiqueta {report.tagColor}
                  </span>
                </div>

                {isRejected && (
                  <div className="flex items-center space-x-1 text-red-800 bg-red-50 border border-red-300 px-2 py-1 font-bold text-[10px] uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Cuarentena (&lt;40 min SLA)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones técnicas con líneas para escritura a mano */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-700 mb-1 flex justify-between">
                <span>Observaciones Técnicas de Calidad (Para redacción manual o digital):</span>
                <span className="text-neutral-400 text-[9px] font-mono">Espacio de 3 líneas regladas</span>
              </label>
              <textarea
                value={report.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows={3}
                style={{ borderColor: tableBorder, color: cellValText, fontSize: `${szCellValues}px` }}
                className="w-full bg-[#FAF9F6] border-2 p-3 focus:outline-emerald-600 font-sans leading-relaxed min-h-[90px] bg-[linear-gradient(transparent_27px,#e5e7eb_28px)] bg-[length:100%_28px]"
                placeholder="Escriba las observaciones técnicas de dictaminación..."
              />
            </div>

            {/* Plan de Acción con líneas para escritura a mano */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-700 mb-1 flex justify-between">
                <span>Plan de Acción y Medidas Correctivas:</span>
                <span className="text-neutral-400 text-[9px] font-mono">Espacio de 3 líneas regladas</span>
              </label>
              <textarea
                value={report.planDeAccion}
                onChange={(e) => handleChange('planDeAccion', e.target.value)}
                rows={3}
                style={{ borderColor: tableBorder, color: cellValText, fontSize: `${szCellValues}px` }}
                className="w-full bg-[#FAF9F6] border-2 p-3 focus:outline-emerald-600 font-sans leading-relaxed min-h-[90px] bg-[linear-gradient(transparent_27px,#e5e7eb_28px)] bg-[length:100%_28px]"
                placeholder="Escriba el plan de acción, correcciones o aislamiento..."
              />
            </div>
          </div>
        </div>

        {/* ==========================================
            SECCIÓN VII: FIRMAS DE CONFORMIDAD Y APROBACIÓN OPERATIVA (CALIDAD Y MAQUILA)
           ========================================== */}
        <div className="mb-4">
          <div
            className="font-bold px-3.5 py-2 uppercase tracking-[0.15em] border"
            style={{
              backgroundColor: sHeaderBg,
              color: sHeaderText,
              borderColor: tableBorder,
              fontFamily: titleFontFamily,
              fontSize: `${szSectionTitles}px`,
            }}
          >
            <span className="italic font-normal">{cfg.section7Title}</span>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 border-2 bg-white text-[10px]"
            style={{
              borderColor: tableBorder,
            }}
          >
            {/* Firma 1: Inspector / Supervisor de Calidad */}
            <div className="p-4 space-y-3">
              <div
                className="font-bold text-center border-b-2 pb-1.5 uppercase tracking-wider text-[10px] bg-[#FAF9F6] py-1"
                style={{ borderColor: tableBorder, color: cellValText }}
              >
                1. INSPECCIÓN Y LIBERACIÓN DE CALIDAD
              </div>
              <div className="text-center px-4">
                <div
                  className="border-t-2 pt-3 mt-8 relative min-h-[110px] flex flex-col justify-end"
                  style={{ borderColor: tableBorder }}
                >
                  {report.firmaCalidad?.signatureDataUrl ? (
                    <img
                      src={report.firmaCalidad.signatureDataUrl}
                      alt="Firma Calidad"
                      className="max-h-16 max-w-full mx-auto mb-1 object-contain"
                    />
                  ) : (
                    <span className="absolute top-2 left-0 right-0 text-[8px] text-neutral-400 uppercase font-mono italic">
                      Espacio para Firma / Rúbrica (Física o Digital)
                    </span>
                  )}
                  <input
                    type="text"
                    value={report.firmaCalidad?.nombre || report.inspectorName || ''}
                    onChange={(e) =>
                      handleChange('firmaCalidad', { ...report.firmaCalidad, nombre: e.target.value })
                    }
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full text-center font-bold bg-transparent focus:outline-none border-b border-dashed border-neutral-300 pb-0.5"
                    placeholder="Nombre Inspector / Supervisor de Calidad"
                  />
                  <div className="font-black text-neutral-900 uppercase text-[10px] tracking-wider mt-1.5">
                    REALIZÓ INSPECCIÓN (CALIDAD)
                  </div>
                  <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                    Fecha: {report.firmaCalidad?.fecha || report.inspectionDate || 'Pendiente'}
                  </div>
                </div>
              </div>
            </div>

            {/* Firma 2: Supervisor de Maquila */}
            <div className="p-4 space-y-3">
              <div
                className="font-bold text-center border-b-2 pb-1.5 uppercase tracking-wider text-[10px] bg-[#FAF9F6] py-1"
                style={{ borderColor: tableBorder, color: cellValText }}
              >
                2. CONFORMIDAD Y APROBACIÓN DE MAQUILA
              </div>
              <div className="text-center px-4">
                <div
                  className="border-t-2 pt-3 mt-8 relative min-h-[110px] flex flex-col justify-end"
                  style={{ borderColor: tableBorder }}
                >
                  {report.firmaMaquila?.signatureDataUrl ? (
                    <img
                      src={report.firmaMaquila.signatureDataUrl}
                      alt="Firma Maquila"
                      className="max-h-16 max-w-full mx-auto mb-1 object-contain"
                    />
                  ) : (
                    <span className="absolute top-2 left-0 right-0 text-[8px] text-neutral-400 uppercase font-mono italic">
                      Espacio para Firma / Rúbrica (Física o Digital)
                    </span>
                  )}
                  <input
                    type="text"
                    value={report.firmaMaquila?.nombre || ''}
                    onChange={(e) =>
                      handleChange('firmaMaquila', { ...report.firmaMaquila, nombre: e.target.value })
                    }
                    style={{ color: cellValText, fontSize: `${szCellValues}px` }}
                    className="w-full text-center font-bold bg-transparent focus:outline-none border-b border-dashed border-neutral-300 pb-0.5"
                    placeholder="Nombre del Supervisor de Maquila"
                  />
                  <div className="font-black text-neutral-900 uppercase text-[10px] tracking-wider mt-1.5">
                    APRUEBA INSPECCIÓN (SUPERVISIÓN MAQUILA)
                  </div>
                  <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                    Fecha: {report.firmaMaquila?.fecha || report.inspectionDate || 'Pendiente'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div
          className="mt-5 pt-2 border-t font-mono flex items-center justify-between italic"
          style={{
            borderColor: tableBorder,
            color: subtitleText,
            fontSize: `${szFooterNote}px`,
          }}
        >
          <span>
            {report.folioCode}, v{report.version}. Documento normativo propiedad de Suave y Fácil S. A. de C.V. Queda prohibida su reproducción sin autorización.
          </span>
          <span className="font-bold not-italic uppercase tracking-widest" style={{ color: cellValText }}>
            Página 1 de 1 (Carta)
          </span>
        </div>
      </div>
    </div>

    {/* CONTROL FLOTANTE DE ZOOM (SIEMPRE DISPONIBLE AL HACER SCROLL) */}
    <div
      className="no-print fixed bottom-5 right-4 sm:right-6 z-40 bg-slate-950/90 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 flex items-center space-x-1 ring-1 ring-white/10"
      role="toolbar"
      aria-label="Controles rápidos de zoom"
    >
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoomLevel <= 0.35}
        className="p-2 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 rounded-xl text-slate-300 hover:text-white transition"
        title="Alejar Reporte (-10%)"
        aria-label="Alejar"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleToggleFitOrReset}
        className="px-2.5 py-1 hover:bg-slate-800 active:scale-95 rounded-xl font-mono text-xs font-bold text-amber-400 transition"
        title="Alternar entre Ajustar a Pantalla y 100%"
      >
        {Math.round(zoomLevel * 100)}%
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoomLevel >= 1.6}
        className="p-2 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 rounded-xl text-slate-300 hover:text-white transition"
        title="Acercar Reporte (+10%)"
        aria-label="Acercar"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-0.5" />

      <button
        type="button"
        onClick={handleFitWidth}
        className={`p-2 rounded-xl transition active:scale-95 ${
          isAutoFit
            ? 'bg-amber-400 text-slate-950'
            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
        }`}
        title="Ajustar al Ancho de la Pantalla"
        aria-label="Ajustar al ancho"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);
};
