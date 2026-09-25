import React, { useState, useEffect } from 'react';
import { QualityReport } from './types/qualityReport';
import { SAMPLE_REPORTS } from './data/sampleReports';
import { DEFAULT_CHECKLIST_ITEMS } from './utils/defaultChecklist';
import { calculateAQLPlan } from './utils/aqlTable';
import { exportReportToExcel, exportInspectionPackageZip } from './utils/excelExport';
import { generateInspectionWordDocument } from './utils/wordExport';
import { downloadOfficialSheetPdf } from './utils/officialSheetPdfExport';
import {
  exportInspectionToSharepointExcel,
  SharePointExportResult,
  clearOTSharepointStatus,
  isOTExportedToSharepoint,
  deleteInspectionFromSharepoint,
  checkSharePointPokaYoke,
} from './utils/sharepointExport';

import { Header } from './components/Header';
import { ExcelGridReport } from './components/ExcelGridReport';
import { MobileWizardView } from './components/mobile/MobileWizardView';
import { AqlCalculatorModal } from './components/AqlCalculatorModal';
import { QualityImprovementsModal } from './components/QualityImprovementsModal';
import { PhotoEvidenceModal } from './components/PhotoEvidenceModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { ComboDefectMatrixModal } from './components/ComboDefectMatrixModal';
import { ReportHistorySidebar } from './components/ReportHistorySidebar';
import { TemplateConfigModal } from './components/TemplateConfigModal';
import { CatalogUploadModal } from './components/CatalogUploadModal';
import { QualityConfigModal } from './components/QualityConfigModal';
import { SharePointSyncModal } from './components/SharePointSyncModal';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from './types/templateConfig';
import {
  getStoredTemplateConfig,
  saveStoredTemplateConfig,
  syncTemplateConfigFromSupabase,
  saveTemplateConfigToSupabase,
  fetchPresetsFromSupabase,
} from './utils/templateConfigStore';
import { Smartphone, FileSpreadsheet } from 'lucide-react';
import {
  saveReportsToIndexedDB,
  loadReportsFromIndexedDB,
} from './utils/reportsIndexedDb';
import { syncCatalogFromSupabase } from './utils/productionCatalogSupabase';
import {
  fetchReportsFromSupabase,
  saveReportToSupabase,
  deleteReportFromSupabase,
} from './utils/reportsSupabase';
import {
  syncInspectorsFromSupabase,
  syncPhotoSectionsFromSupabase,
} from './utils/appConfigStore';
import { syncMasterDefectsFromSupabase } from './utils/defectMatrixSupabase';
import { fetchAqlRulesFromSupabase } from './utils/aqlSupabase';

const LOCAL_STORAGE_KEY = 'cvdirecto_quality_reports_v1';
const TEMPLATE_CONFIG_KEY = 'cvdirecto_sheet_template_config_v1';

export default function App() {
  const [reports, setReports] = useState<QualityReport[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    return SAMPLE_REPORTS;
  });

  const [activeReportId, setActiveReportId] = useState<string>(() => {
    return reports[0]?.id || 'report-2420';
  });

  // Default to mobile poka-yoke view for cellphone supervisors
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isAqlModalOpen, setIsAqlModalOpen] = useState<boolean>(false);
  const [isComboDefectsModalOpen, setIsComboDefectsModalOpen] = useState<boolean>(false);
  const [isQualityGuideOpen, setIsQualityGuideOpen] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isAiAssistOpen, setIsAiAssistOpen] = useState<boolean>(false);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [isCatalogUploadOpen, setIsCatalogUploadOpen] = useState<boolean>(false);
  const [isQualityConfigOpen, setIsQualityConfigOpen] = useState<boolean>(false);
  const [isSharePointModalOpen, setIsSharePointModalOpen] = useState<boolean>(false);

  // Keyboard shortcut to open hidden catalog upload (Ctrl+Shift+C or Alt+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') ||
        (e.altKey && e.key.toLowerCase() === 'c')
      ) {
        e.preventDefault();
        setIsCatalogUploadOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Template customizer state (Logo, Titles, Colors, Codes) con persistencia local y Supabase
  const [templateConfig, setTemplateConfig] = useState<SheetTemplateConfig>(() => {
    return getStoredTemplateConfig();
  });
  const [isTemplateConfigOpen, setIsTemplateConfigOpen] = useState<boolean>(false);
  const [isSyncingReports, setIsSyncingReports] = useState<boolean>(false);

  // Sincronización en segundo plano con Supabase al montar la aplicación
  useEffect(() => {
    // 1. Sincronizar configuración del formato oficial
    syncTemplateConfigFromSupabase().then((res) => {
      if (res.fromCloud && res.data) {
        setTemplateConfig(res.data);
      }
    });

    // 2. Sincronizar catálogo maestro de armados y componentes
    syncCatalogFromSupabase().catch((err) => {
      console.warn('Error inicializando catálogo desde Supabase:', err);
    });

    // 3. Sincronizar reportes de inspección desde Supabase
    fetchReportsFromSupabase().then((res) => {
      if (res.success && res.fromCloud && res.reports.length > 0) {
        setReports(res.reports);
        setActiveReportId(res.reports[0].id);
      }
    }).catch((err) => {
      console.warn('Error inicializando reportes desde Supabase:', err);
    });

    // 4. Sincronizar inspectores de calidad autorizados desde Supabase
    syncInspectorsFromSupabase().catch((err) => {
      console.warn('Error sincronizando inspectores desde Supabase:', err);
    });

    // 5. Sincronizar secciones de evidencia fotográfica desde Supabase
    syncPhotoSectionsFromSupabase().catch((err) => {
      console.warn('Error sincronizando secciones de fotos desde Supabase:', err);
    });

    // 6. Sincronizar banco general de defectos desde Supabase
    syncMasterDefectsFromSupabase().catch((err) => {
      console.warn('Error sincronizando banco de defectos desde Supabase:', err);
    });

    // 7. Precargar matriz de reglas AQL (ANSI / ASQ Z1.4) desde Supabase
    fetchAqlRulesFromSupabase().catch((err) => {
      console.warn('Error precargando reglas AQL desde Supabase:', err);
    });

    // 8. Precargar presets de formato oficial desde Supabase
    fetchPresetsFromSupabase().catch((err) => {
      console.warn('Error precargando presets desde Supabase:', err);
    });

    const handleConfigUpdated = (e: any) => {
      if (e.detail) {
        setTemplateConfig(e.detail);
      }
    };
    window.addEventListener('template-config-updated', handleConfigUpdated);
    return () => window.removeEventListener('template-config-updated', handleConfigUpdated);
  }, []);

  const handleSaveTemplateConfig = (newCfg: SheetTemplateConfig) => {
    setTemplateConfig(newCfg);
    saveStoredTemplateConfig(newCfg);
    saveTemplateConfigToSupabase(newCfg);
  };

  // Zoom state for desktop letter sheet view
  const calculateFitZoom = () => {
    if (typeof window === 'undefined') return 1.0;
    const padding = window.innerWidth < 640 ? 16 : 48;
    const available = window.innerWidth - padding;
    return Math.min(1.0, Math.max(0.35, Math.round((available / 820) * 100) / 100));
  };

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 860) {
      const padding = window.innerWidth < 640 ? 16 : 48;
      return Math.min(1.0, Math.max(0.35, Math.round(((window.innerWidth - padding) / 820) * 100) / 100));
    }
    return 1.0;
  });
  const [isAutoFit, setIsAutoFit] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 860) {
      return true;
    }
    return false;
  });

  const handleFitWidth = () => {
    const fit = calculateFitZoom();
    setZoomLevel(fit);
    setIsAutoFit(true);
  };

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.max(0.35, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setIsAutoFit(false);
    setZoomLevel(1.0);
  };

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

  // Load persistent reports from IndexedDB on startup (handles large photo sets without localStorage quota limit)
  useEffect(() => {
    loadReportsFromIndexedDB()
      .then((indexedReports) => {
        if (indexedReports && indexedReports.length > 0) {
          setReports(indexedReports);
        }
      })
      .catch((err) => {
        console.warn('Could not load reports from IndexedDB:', err);
      });
  }, []);

  // Save reports to IndexedDB (with massive storage capacity) and safely sync localStorage
  useEffect(() => {
    // 1. Persist full reports (including evidence photos and signatures) to IndexedDB
    saveReportsToIndexedDB(reports).catch((e) => {
      console.warn('Error saving reports to IndexedDB:', e);
    });

    // 2. Attempt localStorage for fast reload fallback, gracefully handling quota limits
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // If quota is exceeded, clear the oversized item from localStorage to avoid blocking other data
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (_) {}
      console.info('Reports exceed localStorage 5MB quota; securely stored in IndexedDB.');
    }
  }, [reports]);

  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];

  // Update active report in state and Supabase
  const handleUpdateReport = (updated: QualityReport) => {
    setReports((prev) =>
      prev.map((rep) => (rep.id === updated.id ? updated : rep))
    );
    // Persistencia asíncrona en Supabase
    saveReportToSupabase(updated).catch((err) => {
      console.warn('Error guardando reporte en Supabase:', err);
    });
  };

  // Create new report
  const handleNewReport = () => {
    const today = new Date().toISOString().split('T')[0];

    const newRep: QualityReport = {
      id: `report-${Date.now()}`,
      folioCode: 'CVD-CCA-F-08',
      version: '00',
      revisionDate: today,
      folioOT: '', // En blanco: la supervisora debe ingresarlo manual
      folioMaquila: '',
      noMaquila: '', // Pestaña REGISTRO (Tabla2) en SharePoint CVD-CCA-F-08
      noPedido: '', // Pestaña EVIDENCIAS FOTOGRÁFICAS (Tabla1) en SharePoint CVD-CCA-F-08

      inspectorName: '', // En blanco: la supervisora debe seleccionarse o escribirse
      inspectionDate: today,
      startTime: '08:00',
      endTime: '12:00',
      durationMinutes: 240,

      skuArmado: '', // En blanco: debe seleccionarse o ingresarse
      descripcionArmado: '',
      claveCompuesta: '',
      componentesArmado: [],
      cliente: '', // En blanco: debe seleccionarse
      tipoMaquila: 'Armado Físico',
      moduloMaquila: '', // En blanco
      modulosMaquila: [], // En blanco: mesas de trabajo de maquila
      encargadoModulo: '',

      totalLotSize: 0, // En 0: debe ingresarse
      totalTarimas: 0,
      piezasPorTarima: 100,

      inspectionLevel: 'General II',
      aqlTarget: 1.5,
      codeLetter: '',
      sampleSizeRequired: 0,
      sampleSizeInspected: 0,
      acLimit: 0,
      reLimit: 0,

      defectItems: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
        ...item,
        defectsFound: 0,
        passed: true,
      })),

      totalCritical: 0,
      totalMajor: 0,
      totalMinor: 0,
      totalDefectives: 0,
      defectRatePercentage: 0,

      photoInitial: { captured: false, url: undefined, urls: [], note: '' },
      photoProcess: { captured: false, url: undefined, urls: [], note: '' },
      photoReleasedPiece: { captured: false, url: undefined, urls: [], note: '' },
      photoPalletized: { captured: false, url: undefined, urls: [], note: '' },

      status: 'APROBADO',
      tagColor: 'Verde',
      cuarentenaMoved: false,
      notificationSent40min: false,
      observaciones: '',
      planDeAccion: '',

      firmaCalidad: { nombre: '', fecha: today, firmado: false },
      firmaMaquila: { nombre: '', fecha: today, firmado: false },
      firmaAlmacen: { nombre: '', fecha: today, firmado: false, localizador: '' },

      updatedAt: new Date().toISOString(),
    };

    setReports((prev) => [newRep, ...prev]);
    setActiveReportId(newRep.id);

    // Guardar nuevo reporte en Supabase
    saveReportToSupabase(newRep).catch((err) => {
      console.warn('Error registrando nuevo reporte en Supabase:', err);
    });
  };

  const handleDeleteReport = (id: string) => {
    const targetReport = reports.find((r) => r.id === id);
    if (targetReport) {
      if (targetReport.folioOT) clearOTSharepointStatus(targetReport.folioOT);
      if (targetReport.folioMaquila) clearOTSharepointStatus(targetReport.folioMaquila);
    }
    const filtered = reports.filter((r) => r.id !== id);
    setReports(filtered);
    if (activeReportId === id && filtered.length > 0) {
      setActiveReportId(filtered[0].id);
    }
    // Eliminar de Supabase
    deleteReportFromSupabase(id).catch((err) => {
      console.warn('Error eliminando reporte en Supabase:', err);
    });
  };

  const handleResetSamples = () => {
    setReports(SAMPLE_REPORTS);
    setActiveReportId(SAMPLE_REPORTS[0].id);
    // Sincronizar ejemplos con Supabase
    SAMPLE_REPORTS.forEach((rep) => {
      saveReportToSupabase(rep).catch(console.warn);
    });
  };

  // Sincronización manual de reportes con Supabase
  const handleSyncReportsWithSupabase = async () => {
    setIsSyncingReports(true);
    try {
      const res = await fetchReportsFromSupabase();
      if (res.success && res.fromCloud && res.reports.length > 0) {
        setReports(res.reports);
        if (!res.reports.some((r) => r.id === activeReportId)) {
          setActiveReportId(res.reports[0].id);
        }
      } else {
        // Si Supabase está vacío, respaldar los reportes locales actuales en la nube
        for (const rep of reports) {
          await saveReportToSupabase(rep);
        }
      }
    } finally {
      setIsSyncingReports(false);
    }
  };

  // Apply AQL calculation result to active report
  const handleApplyAqlPlan = (plan: { codeLetter: string; sampleSize: number; ac: number; re: number }) => {
    if (!activeReport) return;
    const updated: QualityReport = {
      ...activeReport,
      codeLetter: plan.codeLetter,
      sampleSizeRequired: plan.sampleSize,
      sampleSizeInspected: plan.sampleSize,
      acLimit: plan.ac,
      reLimit: plan.re,
    };
    handleUpdateReport(updated);
  };

  // Apply text from AI assistant
  const handleApplyAiText = (type: 'observaciones' | 'planDeAccion', text: string) => {
    if (!activeReport) return;
    handleUpdateReport({
      ...activeReport,
      [type]: text,
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (activeReport) {
      exportReportToExcel(activeReport);
    }
  };

  // Export Complete Inspection Package (.ZIP: Excel + Word + Photos)
  const handleExportZipPackage = () => {
    if (activeReport) {
      exportInspectionPackageZip(activeReport);
    }
  };

  // Export Executive Word Report (.docx)
  const handleExportWord = async () => {
    if (!activeReport) return;
    try {
      const wordBlob = await generateInspectionWordDocument(activeReport);
      const url = URL.createObjectURL(wordBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `INFORME_INSPECCION_${activeReport.folioOT || 'OT'}_${activeReport.skuArmado || 'SKU'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar documento de Word:', err);
    }
  };

  // Print Letter PDF
  const handlePrintLetter = () => {
    window.print();
  };

  // Direct High-Resolution Official Sheet PDF Download (300 DPI Letter)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadOfficialPdf = async () => {
    if (!activeReport) return;
    setIsDownloadingPdf(true);
    try {
      await downloadOfficialSheetPdf(activeReport, templateConfig);
    } catch (err) {
      console.error('Error al generar PDF oficial en tamaño carta:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Exportar a Excel SharePoint vía Power Automate desde vista Escritorio
  const [isExportingSharePointDesktop, setIsExportingSharePointDesktop] = useState(false);
  const [sharePointNotification, setSharePointNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const handleExportSharePoint = async () => {
    if (!activeReport) return;

    // Validación Poka-Yoke previa a cualquier envío
    const poka = checkSharePointPokaYoke(activeReport);
    if (!poka.canExport) {
      setSharePointNotification({
        type: 'error',
        message: 'Candado Poka-Yoke Activo',
        details: poka.blockingMessage || 'Faltan requisitos obligatorios para registrar en SharePoint.',
      });
      setIsSharePointModalOpen(true);
      return;
    }

    setIsExportingSharePointDesktop(true);
    setSharePointNotification(null);
    try {
      const res = await exportInspectionToSharepointExcel(activeReport);
      const updated: QualityReport = {
        ...activeReport,
        sharepointExportedAt: new Date().toISOString(),
        sharepointExportStatus: 'EXPORTADO',
        sharepointExportMessage: res.message,
        updatedAt: new Date().toISOString(),
      };
      handleUpdateReport(updated);

      setSharePointNotification({
        type: 'success',
        message: '¡Exportado con éxito a Excel SharePoint (CVD-CCA-F-08)!',
        details: `Pestaña REGISTRO (Tabla2) actualizada (Maquila: ${res.payload.numeroMaquila}) y EVIDENCIAS (Tabla1) registrada (Pedido: ${res.payload.numeroPedido}).`,
      });
      setTimeout(() => setSharePointNotification(null), 7000);
    } catch (err: any) {
      console.error('Error al exportar a SharePoint:', err);
      setSharePointNotification({
        type: 'error',
        message: 'Error al exportar a SharePoint',
        details: err?.message || 'Verifica la conexión a Power Automate.',
      });
    } finally {
      setIsExportingSharePointDesktop(false);
    }
  };

  const handleUnlockSharePoint = async () => {
    if (!activeReport) return;
    try {
      await deleteInspectionFromSharepoint(activeReport);
      const updated: QualityReport = {
        ...activeReport,
        sharepointExportedAt: undefined,
        sharepointExportStatus: 'PENDIENTE',
        sharepointExportMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      handleUpdateReport(updated);
      setSharePointNotification({
        type: 'success',
        message: 'OT Desbloqueada',
        details: 'Se ha restablecido el estado para permitir un reenvío limpio.',
      });
      setTimeout(() => setSharePointNotification(null), 5000);
    } catch (err: any) {
      setSharePointNotification({
        type: 'error',
        message: 'Error al desbloquear',
        details: err?.message,
      });
    }
  };

  if (!activeReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Cargando reporte de calidad...</p>
      </div>
    );
  }

  if (viewMode === 'mobile') {
    return (
      <div className="min-h-screen bg-neutral-100 font-sans">
        <MobileWizardView
          report={activeReport}
          allReports={reports}
          onUpdateReport={handleUpdateReport}
          onNewReport={handleNewReport}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenAqlCalculator={() => setIsAqlModalOpen(true)}
          onOpenComboDefectsModal={() => setIsComboDefectsModalOpen(true)}
          onOpenQualityGuide={() => setIsQualityGuideOpen(true)}
          onOpenAiAssist={() => setIsAiAssistOpen(true)}
          onExportExcel={handleExportExcel}
          onSwitchToDesktopView={() => setViewMode('desktop')}
          onOpenTemplateConfig={() => setIsTemplateConfigOpen(true)}
          onOpenCatalogUpload={() => setIsCatalogUploadOpen(true)}
          onOpenQualityConfig={() => setIsQualityConfigOpen(true)}
        />

        {/* Modals & Drawers accessible from mobile */}
        <ReportHistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          reports={reports}
          activeReportId={activeReportId}
          onSelectReport={(rep) => setActiveReportId(rep.id)}
          onNewReport={handleNewReport}
          onUpdateReport={handleUpdateReport}
          onDeleteReport={handleDeleteReport}
          onResetSamples={handleResetSamples}
          onSyncWithSupabase={handleSyncReportsWithSupabase}
          isSyncing={isSyncingReports}
          onOpenSharepointModal={() => setIsSharePointModalOpen(true)}
        />

        <SharePointSyncModal
          isOpen={isSharePointModalOpen}
          onClose={() => setIsSharePointModalOpen(false)}
          report={activeReport}
          allReports={reports}
          onUpdateReport={handleUpdateReport}
        />

        <AqlCalculatorModal
          isOpen={isAqlModalOpen}
          onClose={() => setIsAqlModalOpen(false)}
          onApplyPlan={handleApplyAqlPlan}
          reportId={activeReport?.id}
          skuArmado={activeReport?.skuArmado}
        />

        <ComboDefectMatrixModal
          isOpen={isComboDefectsModalOpen}
          onClose={() => setIsComboDefectsModalOpen(false)}
          report={activeReport}
          onUpdateReport={handleUpdateReport}
        />

        <QualityImprovementsModal
          isOpen={isQualityGuideOpen}
          onClose={() => setIsQualityGuideOpen(false)}
        />

        <PhotoEvidenceModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          report={activeReport}
          onUpdateReport={handleUpdateReport}
        />

        <AIAssistantModal
          isOpen={isAiAssistOpen}
          onClose={() => setIsAiAssistOpen(false)}
          report={activeReport}
          onApplyText={handleApplyAiText}
        />

        <TemplateConfigModal
          isOpen={isTemplateConfigOpen}
          onClose={() => setIsTemplateConfigOpen(false)}
          config={templateConfig}
          onSaveConfig={handleSaveTemplateConfig}
          onOpenCatalogUpload={() => setIsCatalogUploadOpen(true)}
          currentReport={activeReport}
        />

        <CatalogUploadModal
          isOpen={isCatalogUploadOpen}
          onClose={() => setIsCatalogUploadOpen(false)}
        />

        <QualityConfigModal
          isOpen={isQualityConfigOpen}
          onClose={() => setIsQualityConfigOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      {/* Floating Switcher to Mobile View */}
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-2 text-xs flex items-center justify-between border-b border-slate-800/80 no-print">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Modo Auditoría Completa (Escritorio)</span>
        </div>
        <button
          onClick={() => setViewMode('mobile')}
          className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-amber-500/20 border border-amber-300/40 transition active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Cambiar a Modo Celular (Poka-Yoke)</span>
        </button>
      </div>

      {/* Top Bar Navigation */}
      <Header
        onNewReport={handleNewReport}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAqlCalculator={() => setIsAqlModalOpen(true)}
        onOpenComboDefectsModal={() => setIsComboDefectsModalOpen(true)}
        onOpenQualityGuide={() => setIsQualityGuideOpen(true)}
        onOpenAiAssist={() => setIsAiAssistOpen(true)}
        onExportExcel={handleExportExcel}
        onExportZipPackage={handleExportZipPackage}
        onExportWord={handleExportWord}
        onExportSharePoint={handleExportSharePoint}
        isExportingSharePoint={isExportingSharePointDesktop}
        isSharePointExported={isOTExportedToSharepoint(activeReport)}
        onUnlockSharePoint={handleUnlockSharePoint}
        onOpenSharePointModal={() => setIsSharePointModalOpen(true)}
        onPrintLetter={handlePrintLetter}
        onDownloadOfficialPdf={handleDownloadOfficialPdf}
        isDownloadingPdf={isDownloadingPdf}
        currentReportTitle={`${activeReport.folioOT} • ${activeReport.skuArmado}`}
        isPrintMode={isPrintMode}
        setIsPrintMode={setIsPrintMode}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitWidth={handleFitWidth}
        isAutoFit={isAutoFit}
        onOpenTemplateConfig={() => setIsTemplateConfigOpen(true)}
        onOpenCatalogUpload={() => setIsCatalogUploadOpen(true)}
        onOpenQualityConfig={() => setIsQualityConfigOpen(true)}
        documentCode={templateConfig.documentCode}
      />

      {/* Notificación Flotante de Exportación a SharePoint */}
      {sharePointNotification && (
        <div className="fixed top-16 right-4 z-50 max-w-md animate-in slide-in-from-top-3 shadow-2xl">
          <div
            className={`p-4 rounded-2xl text-white border-2 flex items-start space-x-3 ${
              sharePointNotification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 shadow-emerald-950/50'
                : 'bg-red-950/95 border-red-500 shadow-red-950/50'
            }`}
          >
            <div className="flex-1 text-xs">
              <h4 className="font-black text-sm uppercase tracking-wide">
                {sharePointNotification.message}
              </h4>
              {sharePointNotification.details && (
                <p className="mt-1 text-[11px] text-neutral-200 leading-relaxed">
                  {sharePointNotification.details}
                </p>
              )}
            </div>
            <button
              onClick={() => setSharePointNotification(null)}
              className="text-neutral-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area - Letter Size Canvas */}
      <main className="flex-1">
        <ExcelGridReport
          report={activeReport}
          onUpdateReport={handleUpdateReport}
          onOpenPhotosModal={() => setIsPhotoModalOpen(true)}
          onOpenAqlModal={() => setIsAqlModalOpen(true)}
          onOpenAiAssist={() => setIsAiAssistOpen(true)}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isAutoFit={isAutoFit}
          setIsAutoFit={setIsAutoFit}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitWidth={handleFitWidth}
          onResetZoom={handleResetZoom}
          templateConfig={templateConfig}
          onOpenTemplateConfig={() => setIsTemplateConfigOpen(true)}
        />
      </main>

      {/* Modals & Drawers */}
      <ReportHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        reports={reports}
        activeReportId={activeReportId}
        onSelectReport={(rep) => setActiveReportId(rep.id)}
        onNewReport={handleNewReport}
        onUpdateReport={handleUpdateReport}
        onDeleteReport={handleDeleteReport}
        onResetSamples={handleResetSamples}
        onSyncWithSupabase={handleSyncReportsWithSupabase}
        isSyncing={isSyncingReports}
        onOpenSharepointModal={() => setIsSharePointModalOpen(true)}
      />

      <SharePointSyncModal
        isOpen={isSharePointModalOpen}
        onClose={() => setIsSharePointModalOpen(false)}
        report={activeReport}
        allReports={reports}
        onUpdateReport={handleUpdateReport}
      />

      <AqlCalculatorModal
        isOpen={isAqlModalOpen}
        onClose={() => setIsAqlModalOpen(false)}
        onApplyPlan={handleApplyAqlPlan}
        reportId={activeReport?.id}
        skuArmado={activeReport?.skuArmado}
      />

      <ComboDefectMatrixModal
        isOpen={isComboDefectsModalOpen}
        onClose={() => setIsComboDefectsModalOpen(false)}
        report={activeReport}
        onUpdateReport={handleUpdateReport}
      />

      <QualityImprovementsModal
        isOpen={isQualityGuideOpen}
        onClose={() => setIsQualityGuideOpen(false)}
      />

      <PhotoEvidenceModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        report={activeReport}
        onUpdateReport={handleUpdateReport}
      />

      <AIAssistantModal
        isOpen={isAiAssistOpen}
        onClose={() => setIsAiAssistOpen(false)}
        report={activeReport}
        onApplyText={handleApplyAiText}
      />

      <TemplateConfigModal
        isOpen={isTemplateConfigOpen}
        onClose={() => setIsTemplateConfigOpen(false)}
        config={templateConfig}
        onSaveConfig={handleSaveTemplateConfig}
        onOpenCatalogUpload={() => setIsCatalogUploadOpen(true)}
        currentReport={activeReport}
      />

      <CatalogUploadModal
        isOpen={isCatalogUploadOpen}
        onClose={() => setIsCatalogUploadOpen(false)}
      />

      <QualityConfigModal
        isOpen={isQualityConfigOpen}
        onClose={() => setIsQualityConfigOpen(false)}
      />
    </div>
  );
}
