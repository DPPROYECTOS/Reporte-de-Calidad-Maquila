import React, { useState, useEffect } from 'react';
import { QualityReport } from '../../types/qualityReport';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Settings,
  Layers,
  FileDown,
  Archive,
  FileText,
  Activity,
  Plus,
  Check,
  X,
  ExternalLink,
  Info,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  exportInspectionToSharepointExcel,
  deleteInspectionFromSharepoint,
  testPowerAutomateWebhookConnection,
  batchExportToSharepointExcel,
  BatchExportSummary,
  checkSharePointPokaYoke,
  getCleanFolioOT,
  getCleanNoMaquila,
  getCleanNoPedido,
  isOTExportedToSharepoint,
  getOTSharepointRecord,
  getInspectionLocalPackageFileName,
  getStoredPowerAutomateWebhookUrl,
  saveStoredPowerAutomateWebhookUrl,
} from '../../utils/sharepointExport';
import { exportInspectionPackageZip } from '../../utils/excelExport';
import { generateInspectionWordDocument } from '../../utils/wordExport';

interface MobileStep5SharePointProps {
  report: QualityReport;
  allReports?: QualityReport[];
  onUpdateReport: (updated: QualityReport) => void;
  onPrevStep: () => void;
  onNewReport: () => void;
  onOpenQualityConfig?: () => void;
  onHideStep5?: () => void;
}

export const MobileStep5SharePoint: React.FC<MobileStep5SharePointProps> = ({
  report,
  allReports = [],
  onUpdateReport,
  onPrevStep,
  onNewReport,
  onOpenQualityConfig,
  onHideStep5,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'config'>('single');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [isBatchExporting, setIsBatchExporting] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentFolio?: string } | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchExportSummary | null>(null);

  // Webhook settings & Ping
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getStoredPowerAutomateWebhookUrl());
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; httpStatus?: number } | null>(null);

  // Export package state
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  // Notifications
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string; details?: string } | null>(null);

  const cleanMaquila = getCleanNoMaquila(report);
  const cleanPedido = getCleanNoPedido(report);
  const cleanFolio = getCleanFolioOT(report);

  const pokaYoke = checkSharePointPokaYoke(report);
  const isExported = isOTExportedToSharepoint(report);
  const exportRecord = getOTSharepointRecord(report);

  // Pending reports eligible for batch sync
  const pendingReports = allReports.filter((r) => {
    return !isOTExportedToSharepoint(r);
  });

  const handleExportCurrent = async () => {
    if (!pokaYoke.canExport) {
      setFeedbackNotice({
        type: 'error',
        message: 'Candado Poka-Yoke Activo',
        details: pokaYoke.blockingMessage || 'Completa todos los requisitos obligatorios antes de exportar.',
      });
      return;
    }

    setIsExporting(true);
    setFeedbackNotice(null);

    try {
      const res = await exportInspectionToSharepointExcel(report);
      const updated: QualityReport = {
        ...report,
        sharepointExportedAt: new Date().toISOString(),
        sharepointExportStatus: 'EXPORTADO',
        sharepointExportMessage: res.message,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(updated);

      setFeedbackNotice({
        type: 'success',
        message: '¡Inspección Registrada Exitosamente en SharePoint!',
        details: `Pestaña REGISTRO (Tabla2) actualizada (Maquila: ${res.payload.numeroMaquila || 'N/A'}) y EVIDENCIAS (Tabla1) vinculada (Pedido: ${res.payload.numeroPedido || 'N/A'}).`,
      });
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: 'Error al Conectar con Power Automate',
        details: err?.message || 'Verifica la URL del Webhook o tu conexión a Internet.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUnlockCurrent = async () => {
    setIsUnlocking(true);
    setFeedbackNotice(null);
    try {
      await deleteInspectionFromSharepoint(report);
      const updated: QualityReport = {
        ...report,
        sharepointExportedAt: undefined,
        sharepointExportStatus: 'PENDIENTE',
        sharepointExportMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(updated);

      setFeedbackNotice({
        type: 'info',
        message: 'OT Desbloqueada para Reenvío',
        details: 'Se ha restablecido el estatus para permitir una nueva sincronización limpia en Excel.',
      });
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: 'Error al Desbloquear',
        details: err?.message || 'No fue posible restablecer el estado.',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRunBatchExport = async () => {
    if (pendingReports.length === 0) return;

    setIsBatchExporting(true);
    setBatchSummary(null);
    setFeedbackNotice(null);

    try {
      const summary = await batchExportToSharepointExcel(
        pendingReports,
        (processed, total, currentItem, itemResult) => {
          setBatchProgress({ current: processed, total, currentFolio: currentItem.folioOT });
          if (itemResult.success) {
            onUpdateReport(currentItem);
          }
        }
      );

      setBatchSummary(summary);
      setFeedbackNotice({
        type: 'success',
        message: `Sincronización por Lote Finalizada: ${summary.successful} enviados`,
        details: `${summary.successful} reportes actualizados en SharePoint, ${summary.failed} errores, ${summary.skipped} omitidos.`,
      });
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: 'Error en la sincronización masiva',
        details: err?.message || 'Ocurrió una interrupción durante el envío por lotes.',
      });
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  };

  const handleSaveWebhook = () => {
    saveStoredPowerAutomateWebhookUrl(webhookUrl);
    setFeedbackNotice({
      type: 'success',
      message: 'Configuración Guardada',
      details: 'La URL del Webhook de Power Automate se guardó en este dispositivo.',
    });
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await testPowerAutomateWebhookConnection(webhookUrl);
      setPingResult({
        success: res.success,
        message: res.message,
        httpStatus: res.statusCode,
      });
    } catch (err: any) {
      setPingResult({
        success: false,
        message: err?.message || 'Error desconocido al probar webhook',
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await exportInspectionPackageZip(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      const blob = await generateInspectionWordDocument(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INFORME_INSPECCION_${cleanFolio || 'OT'}_${report.skuArmado || 'SKU'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Banner Superior Paso 5 */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 rounded-2xl border-2 border-emerald-500/40 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <FileSpreadsheet className="w-36 h-36" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>PASO 5 DE 5 • SINCRONIZACIÓN OFICIAL</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <span>SharePoint Online & Lotes</span>
            </h2>
            <p className="text-xs text-emerald-200/90 font-medium">
              Formato CVD-CCA-F-08 • Pestañas REGISTRO (Tabla2) y EVIDENCIAS (Tabla1)
            </p>
          </div>

          <div className="text-right space-y-1.5 flex flex-col items-end">
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                isExported
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-xs'
                  : 'bg-amber-950 text-amber-300 border-amber-500 shadow-xs'
              }`}
            >
              {isExported ? <Lock className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
              <span>{isExported ? 'EXPORTADO' : 'PENDIENTE'}</span>
            </span>
            {onHideStep5 && (
              <button
                type="button"
                onClick={onHideStep5}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
                title="Ocultar Paso 5 de la navegación (requerirá presionar 9 veces para volver a mostrarlo)"
              >
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                <span>Ocultar Paso 5</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen rápido de la OT inspeccionada */}
        <div className="mt-3 pt-3 border-t border-emerald-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="bg-black/30 p-2 rounded-lg">
            <span className="text-emerald-400/80 block text-[9px] uppercase">No. Maquila (Tabla2)</span>
            <span className="font-bold text-white truncate block">{cleanMaquila || 'N/A'}</span>
          </div>
          <div className="bg-black/30 p-2 rounded-lg">
            <span className="text-emerald-400/80 block text-[9px] uppercase">No. Pedido (Tabla1)</span>
            <span className="font-bold text-white truncate block">{cleanPedido || 'N/A'}</span>
          </div>
          <div className="bg-black/30 p-2 rounded-lg">
            <span className="text-emerald-400/80 block text-[9px] uppercase">SKU / Producto</span>
            <span className="font-bold text-white truncate block">{report.skuArmado || 'N/A'}</span>
          </div>
          <div className="bg-black/30 p-2 rounded-lg">
            <span className="text-emerald-400/80 block text-[9px] uppercase">Dictamen Oficial</span>
            <span className={`font-bold block ${report.status === 'APROBADO' ? 'text-emerald-300' : 'text-red-300'}`}>
              {report.status || 'PENDIENTE'}
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Paso 5 */}
      <div className="flex bg-slate-200 p-1 rounded-xl gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'single'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>OT Actual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'batch'
              ? 'bg-cyan-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Por Lotes ({pendingReports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'config'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Webhook / Ping</span>
        </button>
      </div>

      {/* Notificación flotante de feedback */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-xl border-2 text-xs flex items-start space-x-2.5 animate-in slide-in-from-top-2 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100 shadow-md'
              : feedbackNotice.type === 'error'
              ? 'bg-red-950 border-red-500 text-red-100 shadow-md'
              : 'bg-sky-950 border-sky-500 text-sky-100 shadow-md'
          }`}
        >
          {feedbackNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : feedbackNotice.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-black uppercase tracking-wide text-white">{feedbackNotice.message}</h4>
            {feedbackNotice.details && (
              <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed font-sans">{feedbackNotice.details}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: INSPECCIÓN ACTUAL (OT INDIVIDUAL) */}
      {activeTab === 'single' && (
        <div className="space-y-3.5">
          {/* Tarjeta de Estado & Candado */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isExported ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isExported ? <Lock className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-black text-slate-900 text-xs block">
                  {isExported ? 'Registrado en SharePoint (Bloqueado)' : 'Listo para Sincronizar'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isExported && exportRecord?.timestamp
                    ? `Sincronizado: ${new Date(exportRecord.timestamp).toLocaleTimeString()}`
                    : 'Transmisión vía webhook Power Automate'}
                </span>
              </div>
            </div>

            {isExported && (
              <button
                type="button"
                onClick={handleUnlockCurrent}
                disabled={isUnlocking}
                className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                title="Desbloquear para permitir reenvío"
              >
                {isUnlocking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Desbloquear OT</span>
              </button>
            )}
          </div>

          {/* Matriz Poka-Yoke: 8 Candados de Regulación */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Auditoría Poka-Yoke (8 Candados de Regulación)</span>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  pokaYoke.canExport
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {pokaYoke.passedCount} / {pokaYoke.totalCount} Verificados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {pokaYoke.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-2 rounded-xl border flex items-start space-x-2 transition ${
                    rule.passed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}
                >
                  <span className="font-black text-xs shrink-0 mt-0.5">
                    {rule.passed ? '✓' : '⚠️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block truncate">{rule.title}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{rule.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón Principal de Envío a SharePoint */}
          {!isExported ? (
            <button
              type="button"
              onClick={handleExportCurrent}
              disabled={isExporting || !pokaYoke.canExport}
              className={`w-full py-4 px-4 rounded-2xl font-black text-sm transition flex items-center justify-center space-x-2 shadow-lg cursor-pointer active:scale-98 ${
                pokaYoke.canExport
                  ? 'bg-[#107c41] hover:bg-[#0e6b37] text-white shadow-emerald-950/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Transmitiendo a SharePoint Excel Online...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    {pokaYoke.canExport
                      ? 'Enviar Inspección a Excel SharePoint (Paso Final)'
                      : 'Candado Activo: Completa Requisitos Poka-Yoke'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-black text-sm">Inspección Oficialmente Registrada</h4>
              <p className="text-xs text-emerald-700">
                Esta orden ya existe en el archivo <code>CVD-CCA-F-08.xlsx</code> en SharePoint. No se permiten envíos duplicados.
              </p>
            </div>
          )}

          {/* Opciones Adicionales de Exportación Local */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-2">
            <span className="font-bold text-xs text-slate-700 block uppercase tracking-wide">
              Descargas y Respaldo Local:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 border border-slate-300"
              >
                {isExportingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-amber-600" />}
                <span>Paquete ZIP</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExportingWord}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 border border-slate-300"
              >
                {isExportingWord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-blue-600" />}
                <span>Informe Word</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SINCRONIZACIÓN POR LOTES (BATCH) */}
      {activeTab === 'batch' && (
        <div className="space-y-3.5">
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wide text-slate-900">
                Sincronización Masiva por Lotes
              </h3>
              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full font-mono text-[10px] font-bold">
                {pendingReports.length} Pendientes
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Envía automáticamente todos los reportes pendientes uno a uno a SharePoint con retardo anti-colisión (600ms) para garantizar la integridad en Excel Online.
            </p>

            {batchProgress && (
              <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-cyan-900">
                  <span>Enviando reporte {batchProgress.current} de {batchProgress.total}...</span>
                  <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-cyan-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-600 h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
                {batchProgress.currentFolio && (
                  <span className="text-[10px] text-cyan-700 font-mono block">
                    OT Actual: {batchProgress.currentFolio}
                  </span>
                )}
              </div>
            )}

            {batchSummary && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-slate-800 block">Resumen del Lote:</span>
                <div className="grid grid-cols-3 gap-1 font-mono text-[11px] text-center pt-1">
                  <div className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg">
                    <span className="block font-bold">{batchSummary.successful}</span>
                    <span className="text-[9px]">Exitosos</span>
                  </div>
                  <div className="bg-red-100 text-red-800 p-1.5 rounded-lg">
                    <span className="block font-bold">{batchSummary.failed}</span>
                    <span className="text-[9px]">Errores</span>
                  </div>
                  <div className="bg-slate-200 text-slate-700 p-1.5 rounded-lg">
                    <span className="block font-bold">{batchSummary.skipped}</span>
                    <span className="text-[9px]">Omitidos</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunBatchExport}
              disabled={isBatchExporting || pendingReports.length === 0}
              className="w-full py-3.5 px-4 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-98"
            >
              {isBatchExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Lote en SharePoint...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Exportar Todo el Lote ({pendingReports.length} Pendientes)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN WEBHOOK & PING */}
      {activeTab === 'config' && (
        <div className="space-y-3.5">
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-black uppercase tracking-wide text-slate-900">
              Webhook de Microsoft Power Automate
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Configura la dirección HTTP POST del flujo en la nube de Power Automate que escribe en las tablas de SharePoint:
            </p>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-[11px] block">
                URL del Desencadenador HTTP:
              </label>
              <textarea
                rows={3}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://default...powerautomate/automations/..."
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl font-mono text-[10px] text-slate-800 focus:outline-slate-900"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveWebhook}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                Guardar URL
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                {isTestingPing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Hacer Ping</span>
              </button>
            </div>

            {pingResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-center space-x-2 ${
                  pingResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{pingResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE INFERIOR DE ACCIÓN (PASO 5) */}
      <div className="fixed bottom-0 left-0 right-0 p-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-30 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={onPrevStep}
            className="w-10 sm:w-12 h-11 sm:h-12 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-black rounded-xl border border-neutral-300 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Volver al Paso 4: Dictamen"
            aria-label="Volver al Paso 4"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleExportCurrent}
            disabled={isExporting || isExported || !pokaYoke.canExport}
            className={`flex-1 min-w-0 h-11 sm:h-12 px-2 sm:px-4 text-white font-black text-xs sm:text-sm uppercase tracking-wide rounded-xl transition flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-md cursor-pointer ${
              isExported
                ? 'bg-emerald-800 opacity-90 cursor-default'
                : pokaYoke.canExport
                ? 'bg-[#107c41] hover:bg-[#0e6b37] active:scale-98'
                : 'bg-neutral-400 cursor-not-allowed'
            }`}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : isExported ? (
              <Check className="w-4 h-4 shrink-0 stroke-[3]" />
            ) : (
              <Send className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">
              {isExported ? 'OT Sincronizada en SharePoint' : 'Sincronizar SharePoint'}
            </span>
          </button>

          <button
            type="button"
            onClick={onNewReport}
            className="h-11 sm:h-12 px-3 sm:px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-1 shrink-0 cursor-pointer border border-neutral-800 shadow-sm"
            title="Iniciar Nuevo Lote"
          >
            <Plus className="w-4 h-4 text-amber-400 shrink-0 stroke-[2.5]" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
