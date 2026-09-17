import React from 'react';
import { checkSupabaseStatus } from '../lib/supabase';
import {
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Calculator,
  History,
  Palette,
  Database,
  Archive,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  onNewReport?: () => void;
  onOpenHistory?: () => void;
  onOpenAqlCalculator?: () => void;
  onOpenQualityGuide?: () => void;
  onOpenAiAssist?: () => void;
  onOpenComboDefectsModal?: () => void;
  onExportExcel: () => void;
  onExportZipPackage?: () => void;
  onExportWord?: () => void;
  onPrintLetter: () => void;
  currentReportTitle: string;
  isPrintMode?: boolean;
  setIsPrintMode?: (val: boolean) => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitWidth?: () => void;
  isAutoFit?: boolean;
  onOpenTemplateConfig?: () => void;
  onOpenCatalogUpload?: () => void;
  onOpenQualityConfig?: () => void;
  documentCode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenAqlCalculator,
  onOpenComboDefectsModal,
  onExportExcel,
  onExportZipPackage,
  onExportWord,
  onPrintLetter,
  currentReportTitle,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  isAutoFit,
  onOpenTemplateConfig,
  onOpenCatalogUpload,
  onOpenQualityConfig,
  documentCode = 'CVD-CCA-F-08',
}) => {
  const [shieldClickCount, setShieldClickCount] = React.useState<number>(0);
  const shieldTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [calidadClickCount, setCalidadClickCount] = React.useState<number>(0);
  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [catalogClickCount, setCatalogClickCount] = React.useState<number>(0);
  const catalogTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [dbStatus, setDbStatus] = React.useState<{ online: boolean; message?: string } | null>(null);

  React.useEffect(() => {
    checkSupabaseStatus().then((res) => {
      setDbStatus({ online: res.online, message: res.message });
    });
  }, []);

  const handleShieldClick = () => {
    setShieldClickCount((prev) => {
      const next = prev + 1;
      if (next >= 9) {
        if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
        if (onOpenQualityConfig) {
          onOpenQualityConfig();
        }
        return 0;
      }
      return next;
    });

    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    shieldTimerRef.current = setTimeout(() => {
      setShieldClickCount(0);
    }, 5000);
  };

  const handleCalidadClick = () => {
    setCalidadClickCount((prev) => {
      const next = prev + 1;
      if (next >= 9) {
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        if (onOpenTemplateConfig) {
          onOpenTemplateConfig();
        }
        return 0;
      }
      return next;
    });

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setCalidadClickCount(0);
    }, 5000);
  };

  const handleCatalogClick = () => {
    setCatalogClickCount((prev) => {
      const next = prev + 1;
      if (next >= 9) {
        if (catalogTimerRef.current) clearTimeout(catalogTimerRef.current);
        if (onOpenCatalogUpload) {
          onOpenCatalogUpload();
        }
        return 0;
      }
      return next;
    });

    if (catalogTimerRef.current) clearTimeout(catalogTimerRef.current);
    catalogTimerRef.current = setTimeout(() => {
      setCatalogClickCount(0);
    }, 5000);
  };
  return (
    <header className="no-print bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Brand Identity with Signature Poka-Yoke Badge */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={handleShieldClick}
            className={`p-1.5 sm:p-2.5 rounded-xl font-black shadow-md shrink-0 transition active:scale-90 cursor-pointer ${
              shieldClickCount > 0
                ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 scale-105 shadow-amber-500/50 animate-pulse'
                : 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20 ring-1 ring-amber-300/40 hover:scale-105'
            }`}
            title="Presiona 9 veces consecutivas para configurar Inspectores y Secciones de Fotos"
            aria-label="Escudo de Calidad - Configuración"
          >
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="font-black text-xs sm:text-base text-white tracking-wide">
                INSPECCIÓN DE CALIDAD MAQUILA
              </h1>
              <button
                type="button"
                onClick={handleCalidadClick}
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition cursor-pointer select-none active:scale-90 ${
                  calidadClickCount > 0
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md scale-105'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
                title="Presiona 9 veces consecutivas para abrir el editor de formato oficial"
                aria-label="Recuadro Calidad"
              >
                CALIDAD {calidadClickCount > 0 ? `(${calidadClickCount}/9)` : ''}
              </button>
            </div>
            {shieldClickCount > 0 && (
              <div className="text-[10px] text-amber-300 font-bold animate-pulse mt-0.5 flex items-center space-x-1">
                <span>🛡️ Desbloqueando Configuración de Calidad: {shieldClickCount} de 9 clics</span>
                <span className="text-white font-normal">(faltan {9 - shieldClickCount})</span>
              </div>
            )}
            {calidadClickCount > 0 && (
              <div className="text-[10px] text-amber-300 font-bold animate-pulse mt-0.5 flex items-center space-x-1">
                <span>🔓 Desbloqueando editor de hoja: {calidadClickCount} de 9 clics</span>
                <span className="text-white font-normal">(faltan {9 - calidadClickCount})</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 flex-wrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold text-slate-200">
                {currentReportTitle}
              </span>
              <span className="text-slate-500 hidden xs:inline">•</span>
              <span className="text-slate-400 hidden xs:inline">
                AQL (ANSI Z1.4)
              </span>
              {dbStatus && (
                <>
                  <span className="text-slate-500 hidden xs:inline">•</span>
                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      dbStatus.online
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                    title={dbStatus.message || (dbStatus.online ? 'Supabase conectado' : 'Supabase desconectado')}
                  >
                    <Database className="w-2.5 h-2.5" />
                    <span>{dbStatus.online ? 'Supabase Conectado' : 'Supabase Offline'}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Tools + Zoom + Excel Export + Print Letter / PDF */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
          {/* Botón Catálogo de Armados y Claves */}
          {onOpenCatalogUpload && (
            <button
              type="button"
              onClick={onOpenCatalogUpload}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl font-bold border border-emerald-500/30 transition active:scale-95 shadow-sm"
              title="Subir o Sincronizar Catálogo de Claves y Armados (Supabase)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Catálogo</span>
            </button>
          )}

          {/* Botón Matriz de Defectos por Combo */}
          {onOpenComboDefectsModal && (
            <button
              type="button"
              onClick={onOpenComboDefectsModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl font-bold border border-amber-500/30 transition active:scale-95 shadow-sm"
              title="Matriz de Defectos por Combo de Armado (Bloques)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Defectos Combo</span>
            </button>
          )}

          {/* Botón Calculadora AQL */}
          {onOpenAqlCalculator && (
            <button
              type="button"
              onClick={onOpenAqlCalculator}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 rounded-xl font-bold border border-slate-700/80 transition active:scale-95 shadow-sm"
              title="Calculadora de Muestras AQL 1.5%"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">AQL</span>
            </button>
          )}

          {/* Botón Historial */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 rounded-xl font-bold border border-slate-700/80 transition active:scale-95 shadow-sm"
              title="Historial de Inspecciones Guardadas"
            >
              <History className="w-3.5 h-3.5 text-slate-300" />
            </button>
          )}

          {/* Zoom Controls Bar inside Header */}
          {zoomLevel !== undefined && (
            <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={onZoomOut}
                disabled={zoomLevel <= 0.35}
                className="p-1.5 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 rounded-lg text-slate-300 hover:text-white transition"
                title="Alejar Reporte (-10%)"
                aria-label="Alejar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onResetZoom}
                className="font-mono font-black text-[11px] px-2 text-amber-400 hover:text-amber-300 transition"
                title="Click para volver al 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={onZoomIn}
                disabled={zoomLevel >= 1.6}
                className="p-1.5 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 rounded-lg text-slate-300 hover:text-white transition"
                title="Acercar Reporte (+10%)"
                aria-label="Acercar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-800 mx-0.5" />

              <button
                type="button"
                onClick={onFitWidth}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 flex items-center space-x-1 ${
                  isAutoFit
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Ajustar el reporte al ancho de pantalla"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Ajustar</span>
              </button>
            </div>
          )}

          {/* Paquete ZIP (Opción A: Excel + PDF Carta + Word + Fotos) */}
          {onExportZipPackage && (
            <button
              type="button"
              onClick={onExportZipPackage}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-950/20 border border-blue-400/30 transition active:scale-95 cursor-pointer"
              title="Descargar Paquete Completo (.ZIP) con Excel, Hoja Oficial PDF (Tamaño Carta), Informe Word y Carpeta de Fotos"
            >
              <Archive className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden xs:inline">Paquete ZIP</span>
            </button>
          )}

          {/* Word Export */}
          {onExportWord && (
            <button
              type="button"
              onClick={onExportWord}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-950/20 border border-indigo-500/30 transition active:scale-95 cursor-pointer"
              title="Descargar Informe Ejecutivo en Microsoft Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden xs:inline">Word (.docx)</span>
            </button>
          )}

          {/* Excel Export */}
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-950/20 border border-emerald-400/30 transition active:scale-95"
            title="Descargar Hoja de Cálculo Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Solo Excel</span>
          </button>

          {/* Print / PDF Letter Size */}
          <button
            type="button"
            onClick={onPrintLetter}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white text-slate-950 hover:bg-slate-100 rounded-xl font-black shadow-md border border-white transition active:scale-95"
            title="Vista Previa e Imprimir en Tamaño Carta / PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>Imprimir Carta / PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
