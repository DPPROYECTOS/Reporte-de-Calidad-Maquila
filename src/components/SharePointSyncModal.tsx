import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  RotateCcw,
  Lock,
  ExternalLink,
  Layers,
  Settings,
  HelpCircle,
  Clock,
  ArrowRight,
  Database,
  FileText,
  Sparkles,
} from 'lucide-react';
import { QualityReport } from '../types/qualityReport';
import {
  checkSharePointPokaYoke,
  exportInspectionToSharepointExcel,
  batchExportToSharepointExcel,
  deleteInspectionFromSharepoint,
  testPowerAutomateWebhookConnection,
  getStoredPowerAutomateWebhookUrl,
  saveStoredPowerAutomateWebhookUrl,
  isOTExportedToSharepoint,
  getOTSharepointRecord,
  buildSharePointPayload,
  getCleanNoMaquila,
  getCleanNoPedido,
  getCleanFolioOT,
  BatchExportSummary,
} from '../utils/sharepointExport';

interface SharePointSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport;
  allReports?: QualityReport[];
  onUpdateReport: (updated: QualityReport) => void;
}

export const SharePointSyncModal: React.FC<SharePointSyncModalProps> = ({
  isOpen,
  onClose,
  report,
  allReports = [],
  onUpdateReport,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'batch' | 'config'>('current');

  // Estado del reporte actual
  const [isExporting, setIsExporting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [actionErrorNotice, setActionErrorNotice] = useState<string | null>(null);

  // Estado del webhook y ping
  const [webhookUrl, setWebhookUrl] = useState(() => getStoredPowerAutomateWebhookUrl());
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [webhookSavedToast, setWebhookSavedToast] = useState(false);

  // Estado de sincronización masiva
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchExportSummary | null>(null);

  // Cálculos del reporte actual
  const cleanMaquila = getCleanNoMaquila(report);
  const cleanPedido = getCleanNoPedido(report);
  const cleanOT = getCleanFolioOT(report) || cleanPedido || cleanMaquila || 'S/N';
  const pokaYoke = checkSharePointPokaYoke(report);
  const isExported = isOTExportedToSharepoint(report);
  const exportRecord = getOTSharepointRecord(report);
  const previewPayload = buildSharePointPayload(report);

  // Cálculos de reportes para sincronización masiva
  const pendingEligibleReports = allReports.filter((r) => {
    return !isOTExportedToSharepoint(r) && checkSharePointPokaYoke(r).canExport;
  });
  const incompleteReports = allReports.filter((r) => {
    return !isOTExportedToSharepoint(r) && !checkSharePointPokaYoke(r).canExport;
  });
  const alreadyExportedReports = allReports.filter((r) => isOTExportedToSharepoint(r));

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getStoredPowerAutomateWebhookUrl());
      setActionSuccessNotice(null);
      setActionErrorNotice(null);
      setBatchSummary(null);
      setPingResult(null);
    }
  }, [isOpen, report.id]);

  if (!isOpen) return null;

  // Exportar reporte actual
  const handleExportCurrent = async () => {
    setIsExporting(true);
    setActionSuccessNotice(null);
    setActionErrorNotice(null);
    try {
      const res = await exportInspectionToSharepointExcel(report);
      setActionSuccessNotice(res.message);

      const updated: QualityReport = {
        ...report,
        sharepointExportedAt: new Date().toISOString(),
        sharepointExportStatus: 'EXPORTADO',
        sharepointExportMessage: res.message,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(updated);
    } catch (err: any) {
      setActionErrorNotice(err?.message || 'Error al conectar con Power Automate.');
    } finally {
      setIsExporting(false);
    }
  };

  // Desbloquear / Re-enviar reporte actual
  const handleUnlockCurrent = async () => {
    setIsUnlocking(true);
    setActionSuccessNotice(null);
    setActionErrorNotice(null);
    try {
      const res = await deleteInspectionFromSharepoint(report);
      setActionSuccessNotice(res.message);

      const updated: QualityReport = {
        ...report,
        sharepointExportedAt: undefined,
        sharepointExportStatus: 'PENDIENTE',
        sharepointExportMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(updated);
    } catch (err: any) {
      setActionErrorNotice(err?.message || 'Error al restablecer estado de la OT.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Guardar URL de Webhook
  const handleSaveWebhook = () => {
    if (webhookUrl.trim()) {
      saveStoredPowerAutomateWebhookUrl(webhookUrl.trim());
      setWebhookSavedToast(true);
      setTimeout(() => setWebhookSavedToast(false), 3000);
    }
  };

  // Ping de prueba en vivo
  const handlePingTest = async () => {
    setIsTestingWebhook(true);
    setPingResult(null);
    try {
      const res = await testPowerAutomateWebhookConnection(webhookUrl.trim());
      setPingResult(res);
    } catch (err: any) {
      setPingResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Error al realizar el ping',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Ejecución de Sincronización Masiva
  const handleStartBatchExport = async () => {
    if (pendingEligibleReports.length === 0) return;
    setIsBatchExporting(true);
    setBatchSummary(null);
    setBatchProgress({ current: 0, total: pendingEligibleReports.length, label: 'Iniciando lote...' });

    try {
      const summary = await batchExportToSharepointExcel(
        pendingEligibleReports,
        (current, total, currentItem) => {
          setBatchProgress({
            current,
            total,
            label: `Procesando ${currentItem.noPedido || currentItem.folioOT || 'OT'} (${current}/${total})...`,
          });
          // Actualizar reporte a exportado en la app
          onUpdateReport({
            ...currentItem,
            sharepointExportedAt: new Date().toISOString(),
            sharepointExportStatus: 'EXPORTADO',
            updatedAt: new Date().toISOString(),
          });
        }
      );
      setBatchSummary(summary);
    } catch (err: any) {
      setActionErrorNotice(err?.message || 'Error en la sincronización masiva.');
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                  CENTRAL SHAREPOINT & POWER AUTOMATE
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  CVD-CCA-F-08
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                OT: <strong className="text-amber-300">{cleanOT}</strong> • Maquila: <strong className="text-emerald-300">{cleanMaquila || 'S/N'}</strong> • Pedido: <strong className="text-blue-300">{cleanPedido || 'S/N'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center space-x-2 ${
              activeTab === 'current'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inspección Actual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center space-x-2 ${
              activeTab === 'batch'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sincronización Masiva ({pendingEligibleReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center space-x-2 ${
              activeTab === 'config'
                ? 'border-amber-400 text-amber-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Webhook & Ping</span>
          </button>
        </div>

        {/* Notificaciones de éxito o error */}
        {actionSuccessNotice && (
          <div className="p-3 bg-emerald-950 border-b border-emerald-600 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessNotice}</span>
            </div>
            <button type="button" onClick={() => setActionSuccessNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionErrorNotice && (
          <div className="p-3 bg-red-950 border-b border-red-600 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{actionErrorNotice}</span>
            </div>
            <button type="button" onClick={() => setActionErrorNotice(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: INSPECCIÓN ACTUAL */}
          {activeTab === 'current' && (
            <div className="space-y-4">
              {/* Estatus Actual de Exportación */}
              <div className="p-3.5 rounded-xl border flex items-center justify-between bg-slate-950 border-slate-800">
                <div className="flex items-center space-x-3">
                  {isExported ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-white block">
                      {isExported ? 'Registrado Oficialmente en SharePoint' : 'Pendiente de Enviar a SharePoint'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isExported
                        ? `Exportado el ${exportRecord?.timestamp ? new Date(exportRecord.timestamp).toLocaleString() : 'Sesión previa'}`
                        : 'Listo para sincronizar con las pestañas REGISTRO y EVIDENCIAS FOTOGRÁFICAS'}
                    </span>
                  </div>
                </div>

                {isExported && (
                  <button
                    type="button"
                    onClick={handleUnlockCurrent}
                    disabled={isUnlocking}
                    className="py-1.5 px-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-600 text-amber-200 font-bold rounded-lg transition active:scale-95 flex items-center space-x-1.5 cursor-pointer text-xs"
                    title="Permite volver a enviar si se borró la fila en Excel"
                  >
                    {isUnlocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Desbloquear / Re-enviar</span>
                  </button>
                )}
              </div>

              {/* Candados Poka-Yoke: Checklist interactivo de 8 reglas */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-400 uppercase tracking-wide flex items-center space-x-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auditoría Poka-Yoke de Calidad (8 Candados de Regulación)</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pokaYoke.canExport
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                        : 'bg-red-950 text-red-300 border border-red-500/50'
                    }`}
                  >
                    {pokaYoke.canExport ? '✓ 8/8 CUMPLIDOS' : 'INCOMPLETO'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {pokaYoke.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-2 rounded-lg border flex items-center space-x-2 transition ${
                        rule.passed
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                          : 'bg-red-950/40 border-red-800/60 text-red-200'
                      }`}
                    >
                      {rule.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold block leading-tight">{rule.title}</span>
                        <span className="text-[10px] opacity-80 block truncate">
                          {rule.passed ? `✓ ${rule.message}` : `⚠️ ${rule.message}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mapeo de Tablas & Payload en Vivo */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wide">
                  📦 Payload que se transmitirá a Power Automate:
                </span>
                <div className="bg-black/90 p-3 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1 overflow-x-auto">
                  <div><span className="text-purple-400">"accion"</span>: <span className="text-amber-300">"{previewPayload.accion}"</span>,</div>
                  <div><span className="text-purple-400">"numeroMaquila"</span>: <span className="text-emerald-300 font-bold">"{previewPayload.numeroMaquila}"</span> <span className="text-slate-500">// Pestaña REGISTRO (Tabla2)</span>,</div>
                  <div><span className="text-purple-400">"numeroPedido"</span>: <span className="text-blue-300 font-bold">"{previewPayload.numeroPedido}"</span> <span className="text-slate-500">// Pestaña EVIDENCIAS (Tabla1)</span>,</div>
                  <div><span className="text-purple-400">"folioOT"</span>: <span className="text-amber-300">"{previewPayload.folioOT}"</span>,</div>
                  <div><span className="text-purple-400">"claveArmado"</span>: <span className="text-white">"{previewPayload.claveArmado}"</span>,</div>
                  <div><span className="text-purple-400">"piezasInspeccionadas"</span>: <span className="text-amber-400 font-bold">{previewPayload.piezasInspeccionadas}</span>,</div>
                  <div><span className="text-purple-400">"dictamen"</span>: <span className="text-emerald-400 font-bold">"{previewPayload.dictamen}"</span>,</div>
                  <div><span className="text-purple-400">"nombreArchivoLocal"</span>: <span className="text-cyan-300">"{previewPayload.nombreArchivoLocal}"</span></div>
                </div>
              </div>

              {/* Botón de Exportación */}
              <div className="pt-2">
                {isExported ? (
                  <div className="p-3 bg-neutral-900 border border-emerald-600/50 rounded-xl text-center text-emerald-300 font-bold flex items-center justify-center space-x-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Esta orden ya fue subida a SharePoint. Candado activo contra duplicidad.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExportCurrent}
                    disabled={isExporting || !pokaYoke.canExport}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm shadow-xl shadow-emerald-950/40 border border-emerald-400/40 transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmitiendo a Power Automate...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Exportar Ahora a Excel SharePoint (Ambas Pestañas)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SINCRONIZACIÓN MASIVA (BATCH) */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white block text-sm">
                  Despacho Masivo hacia SharePoint
                </span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Envía de manera secuencial todos los reportes de calidad que hayan concluido su inspección física y fotográfica, evitando bloqueos de concurrencia en Excel Online.
                </p>

                {/* Resumen de estados */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-center">
                    <span className="text-lg font-black text-emerald-400 block">{pendingEligibleReports.length}</span>
                    <span className="text-[10px] text-emerald-200 font-bold uppercase">Listos para Enviar</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-teal-950/50 border border-teal-800/80 text-center">
                    <span className="text-lg font-black text-teal-400 block">{alreadyExportedReports.length}</span>
                    <span className="text-[10px] text-teal-200 font-bold uppercase">Ya en SharePoint</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-800/80 text-center">
                    <span className="text-lg font-black text-amber-400 block">{incompleteReports.length}</span>
                    <span className="text-[10px] text-amber-200 font-bold uppercase">Incompletos</span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso interactiva si está en proceso */}
              {isBatchExporting && batchProgress && (
                <div className="p-4 bg-cyan-950/80 border border-cyan-500 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-cyan-200 font-bold">
                    <span>{batchProgress.label}</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Resumen final tras completar lote */}
              {batchSummary && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lote procesado: {batchSummary.successful} exitosos, {batchSummary.failed} con error, {batchSummary.skipped} omitidos.</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pt-1 font-mono text-[10px]">
                    {batchSummary.results.map((r, i) => (
                      <div key={i} className={`p-1.5 rounded flex items-center justify-between ${r.success ? 'bg-emerald-950/60 text-emerald-200' : 'bg-red-950/60 text-red-200'}`}>
                        <span>OT {r.folioOT} • Maq: {r.numeroMaquila} • Ped: {r.numeroPedido}</span>
                        <span>{r.success ? '✓ Éxito' : '✕ Error'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón de envío masivo */}
              <button
                type="button"
                onClick={handleStartBatchExport}
                disabled={isBatchExporting || pendingEligibleReports.length === 0}
                className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-cyan-950/30"
              >
                {isBatchExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exportando Lote a SharePoint...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Todos los Pendientes a SharePoint ({pendingEligibleReports.length})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: CONFIGURACIÓN Y PING TEST */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-white block text-sm">
                  Webhook de Microsoft Power Automate
                </span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  URL del desencadenador HTTP (*When an HTTP request is received*) en tu flujo de nube que escribe en el archivo <code>CVD-CCA-F-08</code> en SharePoint.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    URL del Webhook (POST):
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://prod-XX.westus.logic.azure.com:443/workflows/..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition active:scale-95 text-xs cursor-pointer border border-slate-600"
                  >
                    Guardar URL
                  </button>

                  <button
                    type="button"
                    onClick={handlePingTest}
                    disabled={isTestingWebhook || !webhookUrl.trim()}
                    className="py-1.5 px-3 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600 text-cyan-100 font-bold rounded-lg transition active:scale-95 text-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isTestingWebhook ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando Ping...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Probar Conexión (Ping)</span>
                      </>
                    )}
                  </button>

                  {webhookSavedToast && (
                    <span className="text-emerald-400 text-xs font-bold animate-in fade-in">
                      ✓ Guardado
                    </span>
                  )}
                </div>

                {/* Resultado del Ping */}
                {pingResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                      pingResult.success
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-red-950/80 border-red-500 text-red-200'
                    }`}
                  >
                    {pingResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-bold block">
                        {pingResult.success ? 'Conexión Exitosa con Power Automate' : 'Fallo de Comunicación'} ({pingResult.latencyMs}ms)
                      </span>
                      <p className="text-[11px] opacity-90 leading-tight">
                        {pingResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Guía Técnica del Flujo */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-amber-400 uppercase tracking-wide block text-[11px]">
                  📋 Esquema de Tablas en SharePoint:
                </span>
                <ul className="space-y-1.5 text-slate-300 pl-1 text-[11px]">
                  <li>
                    • <strong className="text-emerald-400">Pestaña REGISTRO (Tabla2):</strong> Mapear columna <em>NO. DE MAQUILA</em> a <code>@triggerBody()?['numeroMaquila']</code>. Actualiza piezas y dictamen.
                  </li>
                  <li>
                    • <strong className="text-blue-400">Pestaña EVIDENCIAS FOTOGRÁFICAS (Tabla1):</strong> Mapear columna <em>PEDIDO / OT</em> a <code>@triggerBody()?['numeroPedido']</code>. Inserta clave y nombre de archivo zip.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Certificación Poka-Yoke • Maquilas y Calidad
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
