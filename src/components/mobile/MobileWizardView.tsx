import React, { useState, useEffect, useRef } from 'react';
import { checkSupabaseStatus } from '../../lib/supabase';
import { QualityReport } from '../../types/qualityReport';
import { MobileStep1LotSetup } from './MobileStep1LotSetup';
import { MobileStep2Inspection } from './MobileStep2Inspection';
import { MobileStep3Photos } from './MobileStep3Photos';
import { MobileStep4Disposition } from './MobileStep4Disposition';
import { 
  ClipboardList, 
  Search, 
  Camera, 
  PenTool, 
  CheckCircle2, 
  FileSpreadsheet, 
  Plus, 
  History,
  ShieldCheck,
  Calculator,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
  X,
  Layers,
  Database
} from 'lucide-react';

interface MobileWizardViewProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onNewReport: () => void;
  onOpenHistory: () => void;
  onOpenAqlCalculator?: () => void;
  onOpenQualityGuide?: () => void;
  onOpenAiAssist?: () => void;
  onOpenComboDefectsModal?: () => void;
  onExportExcel?: () => void;
  onSwitchToDesktopView?: () => void;
  onOpenTemplateConfig?: () => void;
  onOpenCatalogUpload?: () => void;
  onOpenQualityConfig?: () => void;
}

export const MobileWizardView: React.FC<MobileWizardViewProps> = ({
  report,
  onUpdateReport,
  onNewReport,
  onOpenHistory,
  onOpenAqlCalculator,
  onOpenQualityGuide,
  onOpenAiAssist,
  onOpenComboDefectsModal,
  onExportExcel,
  onSwitchToDesktopView,
  onOpenTemplateConfig,
  onOpenCatalogUpload,
  onOpenQualityConfig,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [lockedStepAlert, setLockedStepAlert] = useState<string | null>(null);
  const [isConfirmNewModalOpen, setIsConfirmNewModalOpen] = useState<boolean>(false);
  const [showNewReportToast, setShowNewReportToast] = useState<boolean>(false);

  const [shieldTapCount, setShieldTapCount] = useState<number>(0);
  const shieldTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [calidadTapCount, setCalidadTapCount] = useState<number>(0);
  const calidadTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [catalogTapCount, setCatalogTapCount] = useState<number>(0);
  const catalogTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);
  const lastReportIdRef = useRef<string>(report.id);

  const [dbStatus, setDbStatus] = useState<{ online: boolean; message?: string } | null>(null);

  useEffect(() => {
    checkSupabaseStatus().then((res) => {
      setDbStatus({ online: res.online, message: res.message });
    });
  }, []);

  // Activación de ventana de configuración de Inspectores y Fotos al presionar 9 veces el ESCUDO
  const handleShieldTap = () => {
    if (shieldTapTimerRef.current) clearTimeout(shieldTapTimerRef.current);
    const next = shieldTapCount + 1;
    if (next >= 9) {
      setShieldTapCount(0);
      if (onOpenQualityConfig) {
        onOpenQualityConfig();
      }
      return;
    }
    setShieldTapCount(next);
    shieldTapTimerRef.current = setTimeout(() => {
      setShieldTapCount(0);
    }, 5000);
  };

  // Activación de ventana de configuración de formato al presionar 9 veces CALIDAD
  const handleCalidadTap = () => {
    if (calidadTapTimerRef.current) clearTimeout(calidadTapTimerRef.current);
    const next = calidadTapCount + 1;
    if (next >= 9) {
      setCalidadTapCount(0);
      if (onOpenTemplateConfig) {
        onOpenTemplateConfig();
      }
      return;
    }
    setCalidadTapCount(next);
    calidadTapTimerRef.current = setTimeout(() => {
      setCalidadTapCount(0);
    }, 5000);
  };

  // Activación de ventana de catálogo Excel/CSV al presionar 9 veces el código de documento
  const handleCatalogTap = () => {
    if (catalogTapTimerRef.current) clearTimeout(catalogTapTimerRef.current);
    const next = catalogTapCount + 1;
    if (next >= 9) {
      setCatalogTapCount(0);
      if (onOpenCatalogUpload) {
        onOpenCatalogUpload();
      }
      return;
    }
    setCatalogTapCount(next);
    catalogTapTimerRef.current = setTimeout(() => {
      setCatalogTapCount(0);
    }, 5000);
  };

  const scrollToTop = () => {
    // 1. Scroll window
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // 2. Scroll document root and body
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
    // 3. Scroll ref anchor into view
    topAnchorRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  };

  // POKA-YOKE: Redirigir al Paso 1 cada vez que cambie o se cree una nueva inspección
  useEffect(() => {
    if (lastReportIdRef.current !== report.id) {
      lastReportIdRef.current = report.id;
      setCurrentStep(1);
      scrollToTop();
      setShowNewReportToast(true);
      const timer = setTimeout(() => setShowNewReportToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [report.id]);

  const handleStepChange = (newStep: 1 | 2 | 3 | 4) => {
    setCurrentStep(newStep);
    scrollToTop();
  };

  // Scroll to top immediately whenever currentStep changes
  useEffect(() => {
    scrollToTop();
    const timer = setTimeout(() => {
      scrollToTop();
    }, 10);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // CANDADOS POKA-YOKE: Validación estricta de requisitos para no dejar fallar a la supervisora
  const hasInspector = Boolean(report.inspectorName && report.inspectorName.trim() !== '');
  const hasFolio = Boolean(report.folioOT && report.folioOT.trim() !== '');
  const hasSku = Boolean(report.skuArmado && report.skuArmado.trim() !== '');
  const hasLotSize = Boolean(report.totalLotSize && report.totalLotSize > 0);

  const isStep1Complete = hasInspector && hasFolio && hasSku && hasLotSize;

  const isStep2Complete = Boolean(report.sampleSizeInspected && report.sampleSizeInspected > 0);

  const hasPhotoSlot = (slot?: { captured?: boolean; url?: string; urls?: string[] }) => {
    if (!slot) return false;
    return Boolean((slot.urls && slot.urls.length > 0) || (slot.captured && slot.url));
  };

  const isStep3Complete = 
    hasPhotoSlot(report.photoInitial) &&
    hasPhotoSlot(report.photoProcess) &&
    hasPhotoSlot(report.photoReleasedPiece) &&
    hasPhotoSlot(report.photoPalletized);

  const isStepUnlocked = (stepNum: number): boolean => {
    if (stepNum === 1) return true;
    if (stepNum === 2) return isStep1Complete;
    if (stepNum === 3) return isStep1Complete && isStep2Complete;
    if (stepNum === 4) return isStep1Complete && isStep2Complete && isStep3Complete;
    return false;
  };

  const handleStepClick = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === currentStep) return;

    if (targetStep === 2 && !isStep1Complete) {
      setLockedStepAlert(
        '🔒 Candado Poka-Yoke Paso 2 Bloqueado: Primero debes completar los 4 requisitos del Paso 1 (Inspector, Folio OT, Clave SKU y Cantidad de Piezas) para poder comenzar la revisión.'
      );
      return;
    }

    if (targetStep === 3) {
      if (!isStep1Complete) {
        setLockedStepAlert(
          '🔒 Candado Poka-Yoke Paso 3 Bloqueado: Primero debes completar los 4 requisitos del Paso 1.'
        );
        return;
      }
      if (!isStep2Complete) {
        setLockedStepAlert(
          '🔒 Candado Poka-Yoke Paso 3 Bloqueado: Primero debes registrar la inspección física de las piezas de la muestra en el Paso 2 antes de tomar las fotos.'
        );
        return;
      }
    }

    if (targetStep === 4) {
      if (!isStep1Complete) {
        setLockedStepAlert(
          '🔒 Candado Poka-Yoke Paso 4 Bloqueado: Primero debes configurar la orden en el Paso 1.'
        );
        return;
      }
      if (!isStep2Complete) {
        setLockedStepAlert(
          '🔒 Candado Poka-Yoke Paso 4 Bloqueado: Primero debes registrar la inspección física de las piezas en el Paso 2.'
        );
        return;
      }
      if (!isStep3Complete) {
        const capturedPhotos = [
          hasPhotoSlot(report.photoInitial),
          hasPhotoSlot(report.photoProcess),
          hasPhotoSlot(report.photoReleasedPiece),
          hasPhotoSlot(report.photoPalletized),
        ].filter(Boolean).length;
        setLockedStepAlert(
          `🔒 Candado Poka-Yoke Paso 4 Bloqueado: Faltan ${4 - capturedPhotos} de las 4 fotos obligatorias en el Paso 3. Por norma de calidad debes tomar las 4 fotos antes de emitir y firmar el dictamen final.`
        );
        return;
      }
    }

    setLockedStepAlert(null);
    handleStepChange(targetStep);
  };

  const handleExecuteNewReport = () => {
    setIsConfirmNewModalOpen(false);
    onNewReport();
    setCurrentStep(1);
    scrollToTop();
  };

  const steps = [
    { number: 1, label: '1. Lote', sublabel: 'Configurar', icon: ClipboardList, desc: 'Datos de la orden' },
    { number: 2, label: '2. Revisión', sublabel: 'Muestreo', icon: Search, desc: 'Conteo de piezas' },
    { number: 3, label: '3. Fotos', sublabel: '4 Pruebas', icon: Camera, desc: '4 fotos obligatorias' },
    { number: 4, label: '4. Dictamen', sublabel: 'Firmar', icon: PenTool, desc: 'Resultado y firma' },
  ];

  // Helper tips orientados a supervisores paso a paso
  const stepGuides: Record<number, { tag: string; title: string; instruction: string; color: string }> = {
    1: {
      tag: 'PASO 1 DE 4',
      title: 'Configura la Orden y el Producto',
      instruction: 'Selecciona el producto o combo y tu nombre. El sistema calculará automáticamente cuántas piezas debes revisar.',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    2: {
      tag: 'PASO 2 DE 4',
      title: 'Revisa las Piezas Físicas',
      instruction: 'Toma la cantidad de piezas de la muestra. Si encuentras algún defecto o daño, tócalo para sumarlo.',
      color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    },
    3: {
      tag: 'PASO 3 DE 4',
      title: 'Toma las 4 Fotos Obligatorias',
      instruction: 'Captura las 4 evidencias requeridas (inicial, armado, muestra y tarima) para desbloquear la firma.',
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
    4: {
      tag: 'PASO 4 DE 4',
      title: 'Revisa el Dictamen y Firma',
      instruction: 'El sistema calcula en automático si el lote se APRUEBA o RECHAZA según la norma AQL. Firma con el dedo.',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
  };

  const currentGuide = stepGuides[currentStep];
  const progressPercentage = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 100;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 pb-12 font-sans">
      {/* Toast Poka-Yoke de Nueva Inspección Redirigida */}
      {showNewReportToast && (
        <aside 
          aria-label="Notificación de nueva inspección"
          className="bg-emerald-500 text-slate-950 px-4 py-2.5 font-bold text-xs flex items-center justify-between shadow-lg border-b border-emerald-400 animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center space-x-2">
            <span className="text-base">✨</span>
            <span>
              ¡Nueva inspección iniciada! Folio <strong>{report.folioOT || 'Nuevo'}</strong>. Has sido redirigido al <strong>Paso 1: Configurar Lote</strong>.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => setShowNewReportToast(false)}
            className="text-slate-950 font-black p-1 hover:bg-emerald-400/50 rounded-lg text-xs"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Barra Superior Móvil Fija - Ultracompacta y Ergonómica */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-3 py-2 sm:px-5 sm:py-2.5 shadow-lg border-b border-slate-800">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
          {/* Fila 1: Marca, Folios y Acciones en una sola línea */}
          <div className="flex items-center justify-between gap-2">
            {/* Izquierda: Escudo + Título e Indicadores */}
            <div className="flex items-center space-x-2 min-w-0">
              <button
                type="button"
                onClick={handleShieldTap}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-black shadow-xs shrink-0 transition active:scale-90 cursor-pointer flex items-center justify-center ${
                  shieldTapCount > 0
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-105 shadow-amber-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20 ring-1 ring-amber-300/40 hover:scale-105'
                }`}
                title="Presiona 9 veces consecutivas para abrir la configuración de Inspectores y Fotos"
                aria-label="Escudo de Calidad - Configuración"
              >
                <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-black text-xs sm:text-sm text-white tracking-wide truncate">
                    CALIDAD MAQUILA
                  </h1>
                  <button
                    type="button"
                    onClick={handleCalidadTap}
                    className={`text-[8.5px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider transition cursor-pointer select-none active:scale-90 shrink-0 ${
                      calidadTapCount > 0
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-xs scale-105'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                    title="Presiona 9 veces consecutivas para abrir el editor de formato oficial"
                    aria-label="Recuadro Calidad"
                  >
                    CALIDAD {calidadTapCount > 0 ? `(${calidadTapCount}/9)` : ''}
                  </button>
                </div>

                {/* Indicadores de OT, SKU y Estado DB */}
                <div className="flex items-center space-x-1.5 text-[9.5px] sm:text-[10px] text-slate-400 font-mono leading-none mt-0.5 truncate">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-200 truncate max-w-[110px] sm:max-w-[150px]">
                    {report.folioOT || 'OT-Nueva'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 truncate max-w-[110px] sm:max-w-[200px]">
                    {report.skuArmado ? report.skuArmado.split(' ')[0] : 'Sin SKU'}
                  </span>
                  {dbStatus && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span
                        className={`inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[8px] font-mono border shrink-0 ${
                          dbStatus.online
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                        title={dbStatus.message || (dbStatus.online ? 'Supabase conectado' : 'Supabase offline')}
                      >
                        <Database className="w-2.5 h-2.5" />
                        <span>{dbStatus.online ? 'DB' : 'Off'}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Derecha: Acciones Rápidas (Catálogo, Guía, Defectos, AQL, Historial) */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              {onOpenCatalogUpload && (
                <button
                  type="button"
                  onClick={onOpenCatalogUpload}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-1.5 rounded-lg active:scale-95 transition flex items-center space-x-1 cursor-pointer"
                  title="Subir o Sincronizar Catálogo de Claves y Armados (Supabase)"
                  aria-label="Catálogo de Armados"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[10px] font-bold hidden sm:inline text-emerald-300">Catálogo</span>
                </button>
              )}

              {onOpenQualityGuide && (
                <button
                  type="button"
                  onClick={onOpenQualityGuide}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-1.5 rounded-lg active:scale-95 transition flex items-center space-x-1 cursor-pointer"
                  title="Guía de Calidad: ¿Cómo hacer la inspección?"
                  aria-label="Guía Técnica"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] font-bold hidden md:inline text-amber-300">Guía</span>
                </button>
              )}

              {onOpenComboDefectsModal && (
                <button
                  type="button"
                  onClick={onOpenComboDefectsModal}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-1.5 rounded-lg active:scale-95 transition flex items-center space-x-1 cursor-pointer"
                  title="Matriz de Defectos por Combo (Bloques)"
                  aria-label="Defectos por Combo"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] font-bold hidden md:inline text-amber-300">Defectos</span>
                </button>
              )}

              {onOpenAqlCalculator && (
                <button
                  type="button"
                  onClick={onOpenAqlCalculator}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-1.5 rounded-lg active:scale-95 transition flex items-center space-x-1 cursor-pointer"
                  title="Calculadora de Muestras AQL 1.5%"
                  aria-label="Calculadora AQL"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[10px] font-bold hidden md:inline text-emerald-300">AQL</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenHistory}
                className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 p-1.5 rounded-lg active:scale-95 transition cursor-pointer"
                title="Historial de Reportes Anteriores"
                aria-label="Historial"
              >
                <History className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Fila 2: 4 Pasos Guiados Compactos + Barra de Progreso Integrada */}
          <div>
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isPast = currentStep > step.number;
                const unlocked = isStepUnlocked(step.number);

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => handleStepClick(step.number as any)}
                    className={`py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg text-center transition flex items-center justify-center space-x-1 border text-xs relative ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black shadow-xs ring-1 ring-amber-300'
                        : !unlocked
                        ? 'bg-slate-900/80 text-slate-500 border-slate-800/80 opacity-60 cursor-not-allowed'
                        : isPast
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-bold hover:bg-emerald-900/60'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 font-medium hover:bg-slate-800/90 hover:text-slate-200'
                    }`}
                    title={!unlocked ? '🔒 Bloqueado por candado Poka-Yoke' : step.desc}
                  >
                    {!unlocked ? (
                      <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                    ) : isPast ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    )}
                    <span className="text-[10px] sm:text-xs font-bold leading-none truncate">
                      {step.label}
                    </span>
                    <span className="text-[9px] text-slate-400 hidden lg:inline font-normal">
                      ({step.sublabel})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Progreso Integrada */}
            <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden border border-slate-700/50 mt-1">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Alerta Candado Poka-Yoke si intenta saltarse pasos */}
      {lockedStepAlert && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="poka-yoke-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border-2 border-red-500 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-red-600">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 id="poka-yoke-title" className="font-black text-sm uppercase tracking-wider text-red-950">
                  Candado Poka-Yoke
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setLockedStepAlert(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
                aria-label="Cerrar modal de candado"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-800 leading-relaxed bg-red-50 p-3 rounded-xl border border-red-200 font-medium">
              {lockedStepAlert}
            </p>

            <button
              type="button"
              onClick={() => setLockedStepAlert(null)}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow"
            >
              Entendido, continuar en orden
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Nueva Inspección */}
      {isConfirmNewModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="nueva-inspeccion-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border-2 border-amber-400 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 id="nueva-inspeccion-title" className="font-black text-base text-neutral-900 leading-tight">
                  ¿Iniciar Nueva Inspección?
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Se generará un nuevo folio en limpio.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-200 leading-relaxed">
              👉 <strong>Guía Poka-Yoke:</strong> El reporte actual quedará guardado en tu Historial y la app te llevará de inmediato al <strong>Paso 1: Configurar Lote</strong> para capturar la nueva orden sin confusiones.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmNewModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-300 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteNewReport}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 transition flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Sí, Iniciar Nueva</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ancla para scroll al inicio de cada paso */}
      <div ref={topAnchorRef} />

      {/* Contenido Principal con Contenedor Responsivo para Celular y Tablet */}
      <main className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto p-3 sm:p-5 pt-2 sm:pt-3">
        {/* Notificaciones flotantes de toques secretos si están activos */}
        {(shieldTapCount > 0 || calidadTapCount > 0 || catalogTapCount > 0) && (
          <div className="mb-2.5 p-2 bg-slate-900 text-white rounded-xl border border-amber-400 text-[11px] font-bold flex items-center justify-between">
            {shieldTapCount > 0 && (
              <span>🛡️ Configuración: {shieldTapCount}/9 toques (faltan {9 - shieldTapCount})</span>
            )}
            {calidadTapCount > 0 && (
              <span>🔓 Desbloqueando Formato: {calidadTapCount}/9 toques (faltan {9 - calidadTapCount})</span>
            )}
            {catalogTapCount > 0 && (
              <span>📦 Catálogo Excel: {catalogTapCount}/9 toques (faltan {9 - catalogTapCount})</span>
            )}
          </div>
        )}

        {/* Tarjeta Guía del Paso Actual (Con scroll natural, sin tapar la pantalla fija) */}
        <div className={`mb-3.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border flex items-start space-x-2.5 text-left shadow-xs transition-all ${currentGuide.color}`}>
          <span className="text-base sm:text-lg shrink-0 select-none mt-0.5">
            {currentStep === 1 ? '📋' : currentStep === 2 ? '🔍' : currentStep === 3 ? '📸' : '✍️'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-90">
                {currentGuide.tag}
              </span>
              <span className="text-[9px] opacity-60">•</span>
              <span className="text-[11px] sm:text-xs font-bold text-white break-words">
                {currentGuide.title}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-200 mt-0.5 leading-snug">
              {currentGuide.instruction}
            </p>
          </div>
        </div>
        {/* PASO 1: DATOS DEL LOTE Y META DE INSPECCIÓN */}
        {currentStep === 1 && (
          <MobileStep1LotSetup
            report={report}
            onUpdateReport={onUpdateReport}
            onNextStep={() => handleStepChange(2)}
            onOpenComboDefectsModal={onOpenComboDefectsModal}
          />
        )}

        {/* PASO 2: REVISIÓN DE PIEZAS */}
        {currentStep === 2 && (
          <MobileStep2Inspection
            report={report}
            onUpdateReport={onUpdateReport}
            onNextStep={() => handleStepChange(3)}
            onPrevStep={() => handleStepChange(1)}
            onOpenComboDefectsModal={onOpenComboDefectsModal}
          />
        )}

        {/* PASO 3: CÁMARA DIRECTA */}
        {currentStep === 3 && (
          <MobileStep3Photos
            report={report}
            onUpdateReport={onUpdateReport}
            onNextStep={() => {
              if (!isStep3Complete) {
                const capturedCount = [
                  report.photoInitial?.captured,
                  report.photoProcess?.captured,
                  report.photoReleasedPiece?.captured,
                  report.photoPalletized?.captured,
                ].filter(Boolean).length;
                setLockedStepAlert(
                  `🔒 Candado Poka-Yoke: Faltan ${4 - capturedCount} fotos obligatorias. La norma exige capturar las 4 fotos antes de emitir el dictamen final.`
                );
                return;
              }
              handleStepChange(4);
            }}
            onPrevStep={() => handleStepChange(2)}
          />
        )}

        {/* PASO 4: DICTAMEN Y FIRMA CON EL DEDO */}
        {currentStep === 4 && (
          <MobileStep4Disposition
            report={report}
            onUpdateReport={onUpdateReport}
            onPrevStep={() => handleStepChange(3)}
            onNewReport={() => setIsConfirmNewModalOpen(true)}
            onOpenAiAssist={onOpenAiAssist}
            onExportExcel={onExportExcel}
            onSwitchToDesktopView={onSwitchToDesktopView}
          />
        )}
      </main>
    </div>
  );
};
