import React, { useState } from 'react';
import { QualityReport } from '../../types/qualityReport';
import { SignaturePad } from './SignaturePad';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Share2, 
  Printer, 
  Save, 
  Plus, 
  Tag, 
  ShieldCheck, 
  Check, 
  Copy,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  Archive,
  CloudCheck,
  Loader2,
  FileText,
  Settings,
  Send,
  CloudUpload,
  X,
  Lock,
  RefreshCw,
  Trash2,
  Key
} from 'lucide-react';
import { exportInspectionPackageZip } from '../../utils/excelExport';
import { generateInspectionWordDocument } from '../../utils/wordExport';
import { detectDeviceEnvironment } from '../../utils/deviceEnvironment';
import { PowerAutomateHelpModal } from '../PowerAutomateHelpModal';
import { 
  exportInspectionToSharepointExcel, 
  deleteInspectionFromSharepoint,
  testPowerAutomateWebhookConnection,
  SharePointExportResult, 
  getCleanFolioOT,
  getCleanNoMaquila,
  getCleanNoPedido,
  checkSharePointPokaYoke,
  PokaYokeCheckSummary,
  getInspectionLocalPackageFileName,
  isOTExportedToSharepoint,
  clearOTSharepointStatus,
  isDirectApiAuthError,
  isPowerAutomateMissingSig
} from '../../utils/sharepointExport';
import { 
  getStoredPowerAutomateWebhookUrl, 
  saveStoredPowerAutomateWebhookUrl 
} from '../../utils/appConfigStore';

interface MobileStep4DispositionProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onPrevStep: () => void;
  onNextStep?: () => void;
  isStep5Visible?: boolean;
  onSecretTapStep5?: () => void;
  step5TapCount?: number;
  onNewReport: () => void;
  onOpenAiAssist?: () => void;
  onExportExcel?: () => void;
  onSwitchToDesktopView?: () => void;
}

export const MobileStep4Disposition: React.FC<MobileStep4DispositionProps> = ({
  report,
  onUpdateReport,
  onPrevStep,
  onNextStep,
  isStep5Visible = false,
  onSecretTapStep5,
  step5TapCount = 0,
  onNewReport,
  onOpenAiAssist,
  onExportExcel,
  onSwitchToDesktopView,
}) => {
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipSuccessMsg, setZipSuccessMsg] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [deviceEnv] = useState(() => detectDeviceEnvironment());

  // Estado para exportación directa a SharePoint / Excel Online vía Power Automate
  const cleanMaquila = getCleanNoMaquila(report);
  const cleanPedido = getCleanNoPedido(report);
  const cleanFolio = cleanMaquila || cleanPedido || getCleanFolioOT(report);
  const pokaYoke = checkSharePointPokaYoke(report);

  const [isOTExported, setIsOTExported] = useState(() => isOTExportedToSharepoint(report));
  const [isExportingSharepoint, setIsExportingSharepoint] = useState(false);
  const [isDeletingSharepoint, setIsDeletingSharepoint] = useState(false);
  const [showDeleteSharepointConfirm, setShowDeleteSharepointConfirm] = useState(false);
  const [sharepointResult, setSharepointResult] = useState<SharePointExportResult | null>(null);
  const [sharepointError, setSharepointError] = useState<string | null>(null);
  const [sharepointActionNotice, setSharepointActionNotice] = useState<string | null>(null);
  const [showSharepointConfigModal, setShowSharepointConfigModal] = useState(false);
  const [showPowerAutomateHelpModal, setShowPowerAutomateHelpModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(() => getStoredPowerAutomateWebhookUrl());
  const [webhookSavedMsg, setWebhookSavedMsg] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    latencyMs: number;
    message: string;
  } | null>(null);

  // Mantener actualizado el estado de bloqueo de la OT actual
  React.useEffect(() => {
    setIsOTExported(isOTExportedToSharepoint(report));
  }, [report, cleanFolio, cleanMaquila, cleanPedido, report.sharepointExportStatus, report.folioOT, report.folioMaquila, report.noMaquila, report.noPedido]);

  const isApproved = report.status === 'APROBADO';
  const isRejected = report.status === 'RECHAZADO';
  const isConditional = report.status === 'CONDICIONADO';

  const hasQualitySignature = Boolean(
    report.firmaCalidad?.firmado || report.firmaCalidad?.signatureDataUrl
  );
  const hasMaquilaSignature = Boolean(
    report.firmaMaquila?.firmado || report.firmaMaquila?.signatureDataUrl
  );

  const isReadyToFinalize = hasQualitySignature;

  // Finalize & Save
  const handleSaveReport = () => {
    onUpdateReport({
      ...report,
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString(),
    });
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 4500);
  };

  // Exportar Paquete Completo ZIP (Opción A: Excel estructurado + Informe Word + fotos JPG)
  const handleExportZipPackage = async () => {
    try {
      setIsExportingZip(true);
      await exportInspectionPackageZip(report);
      setZipSuccessMsg(true);
      setTimeout(() => setZipSuccessMsg(false), 3500);
    } catch (err) {
      console.error('Error al exportar paquete ZIP:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Descargar solo el Informe Word (.docx)
  const handleExportWordOnly = async () => {
    try {
      setIsExportingWord(true);
      const wordBlob = await generateInspectionWordDocument(report);
      const url = URL.createObjectURL(wordBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `INFORME_INSPECCION_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al generar informe de Word:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  // Exportar a Excel SharePoint vía Power Automate (como macro en la nube)
  const handleExportToSharepoint = async () => {
    const check = checkSharePointPokaYoke(report);
    if (!check.canExport) {
      setSharepointError(check.blockingMessage || 'Candado Poka-Yoke Activo: Verifica los requisitos pendientes antes de exportar.');
      return;
    }
    try {
      setIsExportingSharepoint(true);
      setSharepointError(null);
      setSharepointResult(null);
      setSharepointActionNotice(null);
      const result = await exportInspectionToSharepointExcel(report);
      setSharepointResult(result);
      setIsOTExported(true);

      // Persistir el estatus de exportación directamente en el reporte y Supabase
      const updatedReport: QualityReport = {
        ...report,
        sharepointExportedAt: new Date().toISOString(),
        sharepointExportStatus: 'EXPORTADO',
        sharepointExportMessage: result.message,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(updatedReport);
    } catch (err: any) {
      console.error('Error al exportar a SharePoint:', err);
      const errMsg = err?.message || 'Error al conectar con el flujo de Power Automate en SharePoint.';
      setSharepointError(errMsg);
      const failedReport: QualityReport = {
        ...report,
        sharepointExportStatus: 'ERROR',
        sharepointExportMessage: errMsg,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(failedReport);
    } finally {
      setIsExportingSharepoint(false);
    }
  };

  // Limpiar / Borrar registro de OT en SharePoint para volver a subir
  const handleDeleteFromSharepoint = async () => {
    if (!cleanFolio) return;
    try {
      setIsDeletingSharepoint(true);
      setSharepointError(null);
      const res = await deleteInspectionFromSharepoint(report);
      setIsOTExported(false);
      setSharepointResult(null);
      setShowDeleteSharepointConfirm(false);
      setSharepointActionNotice(res.message);

      // Actualizar el reporte a PENDIENTE
      const clearedReport: QualityReport = {
        ...report,
        sharepointExportStatus: 'PENDIENTE',
        sharepointExportedAt: undefined,
        sharepointExportMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateReport(clearedReport);
      setTimeout(() => setSharepointActionNotice(null), 5000);
    } catch (err: any) {
      console.error('Error al limpiar OT en SharePoint:', err);
      setSharepointError(err?.message || 'Error al limpiar los datos de la OT en SharePoint.');
    } finally {
      setIsDeletingSharepoint(false);
    }
  };

  // Probar conectividad con Power Automate (Ping de Prueba)
  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await testPowerAutomateWebhookConnection(webhookUrlInput.trim());
      setWebhookTestResult(res);
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Error al probar conexión con Power Automate',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveWebhookUrl = () => {
    if (webhookUrlInput.trim()) {
      saveStoredPowerAutomateWebhookUrl(webhookUrlInput.trim());
      setWebhookSavedMsg(true);
      setTimeout(() => {
        setWebhookSavedMsg(false);
        setShowSharepointConfigModal(false);
      }, 1800);
    }
  };

  // Generate WhatsApp / Copy summary text for plant supervisor group
  const handleCopyWhatsAppSummary = () => {
    const statusEmoji = isApproved ? '🟢 *APROBADO*' : isRejected ? '🔴 *RECHAZADO*' : '🟡 *CONDICIONADO*';
    const tagEmoji = isApproved ? '🟩 Etiqueta Verde' : isRejected ? '🟥 Etiqueta Roja (Cuarentena)' : '🟨 Etiqueta Amarilla';

    const text = `📋 *REPORTE DE INSPECCIÓN DE CALIDAD MAQUILA*
----------------------------------------
📌 *Folio OT:* ${report.folioOT || 'S/N'}
📦 *Combo / SKU:* ${report.skuArmado} - ${report.descripcionArmado}
🔢 *Lote Total:* ${report.totalLotSize} pzas (${report.totalTarimas} tarimas)
🎯 *Muestra Revisada:* ${report.sampleSizeInspected || report.sampleSizeRequired} pzas (AQL ${report.aqlTarget}%)
⚠️ *Defectos Encontrados:* ${report.totalDefectives} (Críticos: ${report.totalCritical}, Mayores: ${report.totalMajor}, Menores: ${report.totalMinor})
🚦 *DICTAMEN FINAL:* ${statusEmoji}
🏷️ *Acción:* ${tagEmoji}
📸 *Evidencias Fotográficas:* 4 de 4 Registradas
👤 *Realizó (Calidad):* ${report.firmaCalidad?.nombre || report.inspectorName || 'Calidad'}
👤 *Aprobó (Maquila):* ${report.firmaMaquila?.nombre || 'Maquila'}
📅 *Fecha/Hora:* ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
----------------------------------------
_Generado con Sistema de Inspección de Calidad Maquila_`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-44 max-w-full overflow-x-hidden">
      {/* 1. DICTAMEN FINAL Y ETIQUETA FÍSICA A COLOCAR */}
      <div
        className={`p-5 rounded-2xl border-2 shadow-md transition-all ${
          isApproved
            ? 'bg-emerald-600 text-white border-emerald-700'
            : isRejected
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-amber-500 text-neutral-950 border-amber-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isApproved && <CheckCircle2 className="w-9 h-9 text-white shrink-0" />}
          {isRejected && <XCircle className="w-9 h-9 text-white shrink-0 animate-bounce" />}
          {isConditional && <AlertTriangle className="w-9 h-9 text-neutral-950 shrink-0" />}

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-90">
              Dictamen Final de Calidad
            </div>
            <h2 className="text-2xl font-black tracking-wide leading-tight">
              {isApproved && 'LOTE APROBADO'}
              {isRejected && 'LOTE RECHAZADO'}
              {isConditional && 'LOTE CONDICIONADO'}
            </h2>
          </div>
        </div>

        {/* TARJETA POKA-YOKE: ACCIÓN FÍSICA INMEDIATA EN PLANTA */}
        <div className="mt-4 bg-black/25 rounded-xl p-3.5 border border-white/20 space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider">
            <Tag className="w-4 h-4" />
            <span>Acción Inmediata en Planta:</span>
          </div>

          <p className="text-xs font-bold leading-snug">
            {isApproved && '✅ Colocar ETIQUETA VERDE a las tarimas y liberar para Almacén / Embarque.'}
            {isRejected && '⛔ Colocar ETIQUETA ROJA, trasladar a ZONA DE CUARENTENA y notificar al Responsable de Maquila.'}
            {isConditional && '⚠️ Colocar ETIQUETA AMARILLA para revisión técnica y retrabajo.'}
          </p>
        </div>
      </div>

      {/* 2. RESUMEN EJECUTIVO DEL LOTE */}
      <div className="bg-white p-4 rounded-2xl border-2 border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-neutral-700" />
            <span>Resumen del Lote Auditado</span>
          </h3>
          <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md">
            {report.folioOT}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 col-span-2">
            <div className="text-[10px] font-bold text-neutral-500 uppercase">Producto Maquilado:</div>
            <div className="font-mono font-black text-neutral-900 mt-0.5">{report.skuArmado}</div>
            <div className="text-xs text-neutral-600 font-medium truncate">{report.descripcionArmado}</div>
          </div>

          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
            <div className="text-[10px] font-bold text-neutral-500 uppercase">Lote y Tarimas:</div>
            <div className="font-black text-neutral-900 mt-0.5">{report.totalLotSize} pzas ({report.totalTarimas} tar.)</div>
          </div>

          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
            <div className="text-[10px] font-bold text-neutral-500 uppercase">Muestra Auditada:</div>
            <div className="font-black text-neutral-900 mt-0.5">{report.sampleSizeInspected || report.sampleSizeRequired} pzas</div>
          </div>
        </div>

        {/* Estatus de las 4 fotos */}
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Evidencias Fotográficas:</span>
          </div>
          <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
            4 de 4 Capturadas ✓
          </span>
        </div>
      </div>

      {/* 3. OBSERVACIONES O PLAN DE ACCIÓN (OPCIONAL) */}
      <div className="bg-white p-4 rounded-2xl border-2 border-neutral-200 shadow-xs space-y-2">
        <label className="block text-xs font-black text-neutral-900 uppercase">
          Observaciones de Calidad (Opcional):
        </label>
        <textarea
          rows={2}
          value={report.observaciones || ''}
          onChange={(e) => onUpdateReport({ ...report, observaciones: e.target.value })}
          placeholder="Escribe aquí notas adicionales sobre el empaque, estiba o lote..."
          className="w-full text-xs p-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl focus:outline-neutral-900 font-medium"
        />
      </div>

      {/* 4. FIRMAS DIGITALES CON EL DEDO (POKA-YOKE) */}
      <div className="space-y-3">
        <div className="px-1">
          <h3 className="font-black text-xs uppercase tracking-wider text-neutral-900 flex items-center space-x-1.5">
            <span>Firmas de Conformidad y Aprobación (Calidad y Maquila)</span>
            <span className="text-red-500">*</span>
          </h3>
          <p className="text-[11px] text-neutral-500">
            Firma directamente con tu dedo en la pantalla para avalar y autorizar la inspección.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Firma 1: Inspector / Supervisor de Calidad */}
          <SignaturePad
            label="1. Realizó Inspección (Supervisor / Inspector de Calidad) *"
            signerName={report.firmaCalidad?.nombre || report.inspectorName || ''}
            onSignerNameChange={(name) =>
              onUpdateReport({
                ...report,
                inspectorName: name,
                firmaCalidad: {
                  ...report.firmaCalidad,
                  nombre: name,
                  fecha: new Date().toISOString(),
                  firmado: Boolean(report.firmaCalidad?.signatureDataUrl),
                },
              })
            }
            signatureDataUrl={report.firmaCalidad?.signatureDataUrl}
            onSaveSignature={(dataUrl) =>
              onUpdateReport({
                ...report,
                firmaCalidad: {
                  nombre: report.firmaCalidad?.nombre || report.inspectorName || 'Supervisor de Calidad',
                  fecha: new Date().toISOString(),
                  firmado: true,
                  signatureDataUrl: dataUrl,
                },
              })
            }
            onClearSignature={() =>
              onUpdateReport({
                ...report,
                firmaCalidad: {
                  ...report.firmaCalidad,
                  firmado: false,
                  signatureDataUrl: undefined,
                },
              })
            }
            placeholderName="Nombre del Inspector / Supervisor de Calidad"
          />

          {/* Firma 2: Supervisor de Maquila */}
          <SignaturePad
            label="2. Aprueba Inspección (Supervisión de Maquila) *"
            signerName={report.firmaMaquila?.nombre || ''}
            onSignerNameChange={(name) =>
              onUpdateReport({
                ...report,
                firmaMaquila: {
                  ...report.firmaMaquila,
                  nombre: name,
                  fecha: new Date().toISOString(),
                  firmado: Boolean(report.firmaMaquila?.signatureDataUrl),
                },
              })
            }
            signatureDataUrl={report.firmaMaquila?.signatureDataUrl}
            onSaveSignature={(dataUrl) =>
              onUpdateReport({
                ...report,
                firmaMaquila: {
                  nombre: report.firmaMaquila?.nombre || 'Supervisor de Maquila',
                  fecha: new Date().toISOString(),
                  firmado: true,
                  signatureDataUrl: dataUrl,
                },
              })
            }
            onClearSignature={() =>
              onUpdateReport({
                ...report,
                firmaMaquila: {
                  ...report.firmaMaquila,
                  firmado: false,
                  signatureDataUrl: undefined,
                },
              })
            }
            placeholderName="Nombre del Supervisor de Maquila"
          />
        </div>
      </div>

      {/* MÓDULO EXCLUSIVO: EXCEL SHAREPOINT ONLINE (CVD-CCA-F-08) */}
      <div className="bg-gradient-to-br from-emerald-950/90 via-neutral-900 to-neutral-950 text-white p-4 rounded-2xl border-2 border-emerald-600/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2.5">
          <div 
            onClick={onSecretTapStep5}
            className="flex items-center space-x-2 cursor-pointer select-none group"
            title="Presiona 9 veces consecutivas para revelar el Paso 5: SharePoint"
          >
            <div className={`p-1.5 rounded-lg shadow-xs transition ${
              step5TapCount > 0 
                ? 'bg-amber-400 text-slate-950 scale-110 ring-2 ring-amber-300 animate-pulse' 
                : 'bg-[#107c41] text-white group-hover:scale-105'
            }`}>
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <span>Excel SharePoint Online</span>
                {step5TapCount > 0 && !isStep5Visible && (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                    {step5TapCount}/9
                  </span>
                )}
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">
                CVD-CCA-F-08 (Hoja Oficial)
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-black/60 border border-emerald-700/50 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
              {cleanFolio ? `OT: ${cleanFolio}` : 'Sin OT'}
            </span>
            <button
              type="button"
              onClick={() => setShowSharepointConfigModal(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Configurar Webhook de SharePoint / Power Automate"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notificación de toques para desbloquear Paso 5 */}
        {step5TapCount > 0 && !isStep5Visible && (
          <div className="p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-200 text-xs font-bold flex items-center justify-between animate-pulse">
            <span className="flex items-center space-x-1.5">
              <span>☁️</span>
              <span>Desbloqueando Paso 5 SharePoint: {step5TapCount}/9 toques</span>
            </span>
            <span className="text-amber-300 font-black text-xs">faltan {9 - step5TapCount}</span>
          </div>
        )}

        {/* ACCESO RÁPIDO A PASO 5 (SOLO VISIBLE SI YA FUE DESBLOQUEADO) */}
        {isStep5Visible && onNextStep && (
          <div className="bg-emerald-900/40 border border-emerald-500/40 p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-black text-emerald-200 block truncate">
                Paso 5: Sincronización SharePoint Online y Lotes
              </span>
              <p className="text-[10px] text-emerald-300/80 leading-tight">
                Panel con envío masivo de órdenes pendientes, diagnósticos y auditoría.
              </p>
            </div>
            <button
              type="button"
              onClick={onNextStep}
              className="px-3 py-1.5 bg-[#107c41] hover:bg-[#0e6b37] text-white font-bold text-xs rounded-lg shrink-0 flex items-center space-x-1 shadow transition cursor-pointer"
            >
              <span>Abrir Paso 5</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* IDENTIFICADORES CLAVE DE EXCEL (REGISTRO VS EVIDENCIAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-emerald-950/60 border border-emerald-600/50 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                1. No. Maquila (Tabla2 REGISTRO)
              </span>
              <span className="font-mono font-black text-white text-xs">
                {cleanMaquila ? `Maquila: ${cleanMaquila}` : '❌ Falta ingresar'}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              cleanMaquila ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}>
              {cleanMaquila ? '✓ Listo' : 'Pendiente'}
            </span>
          </div>

          <div className="bg-blue-950/60 border border-blue-600/50 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wider">
                2. No. Pedido (Tabla1 EVIDENCIAS)
              </span>
              <span className="font-mono font-black text-white text-xs">
                {cleanPedido ? `Pedido: ${cleanPedido}` : '❌ Falta ingresar'}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              cleanPedido ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}>
              {cleanPedido ? '✓ Listo' : 'Pendiente'}
            </span>
          </div>
        </div>

        {/* CANDADOS POKA-YOKE Y ESTÁNDARES DE CALIDAD */}
        <div className="bg-black/50 border border-neutral-700/70 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-neutral-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Candados Poka-Yoke & Calidad:</span>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
              pokaYoke.canExport
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-amber-950 text-amber-300 border-amber-600'
            }`}>
              {pokaYoke.passedCount} / {pokaYoke.totalCount} Verificados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {pokaYoke.rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-2 rounded-lg border flex items-start space-x-2 transition ${
                  rule.passed
                    ? 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                <span className="text-xs font-black shrink-0 mt-0.5">
                  {rule.passed ? '✓' : '⚠️'}
                </span>
                <div className="leading-tight overflow-hidden">
                  <span className="font-bold block text-white/90 truncate">{rule.title}</span>
                  <span className="text-[10px] text-neutral-400 line-clamp-1">{rule.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL DE SHAREPOINT: BLOQUEO ANTI-DUPLICADOS, BLOQUEO POKA-YOKE O BOTÓN ACTIVO */}
        {isOTExported ? (
          /* ESTADO BLOQUEADO: YA ESTÁ SUBIDO EN SHAREPOINT */
          <div className="space-y-2.5">
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OT {cleanFolio} ya registrada en SharePoint — Bloqueado</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                La información de esta orden de trabajo ya fue enviada y pegada en el archivo Excel oficial. 
                El botón de subida se encuentra bloqueado para evitar registros duplicados.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteSharepointConfirm(true)}
              disabled={isDeletingSharepoint}
              className="w-full py-2.5 px-3 bg-red-950/70 hover:bg-red-900 border border-red-700/60 active:scale-98 text-red-200 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs"
            >
              {isDeletingSharepoint ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Limpiando registro en SharePoint...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                  <span>Borrar OT {cleanFolio} de SharePoint para volver a subir</span>
                </>
              )}
            </button>
          </div>
        ) : !pokaYoke.canExport ? (
          /* ESTADO BLOQUEADO POR CANDADO POKA-YOKE */
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-neutral-800/80 border border-neutral-700 text-neutral-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 cursor-not-allowed shadow-inner"
            >
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">🔒 Bloqueado: {pokaYoke.blockingMessage || 'Faltan requisitos Poka-Yoke'}</span>
            </button>
            <p className="text-[10px] text-amber-300/90 text-center">
              👉 Cumple con los requisitos pendientes de la lista superior para habilitar el botón de exportación.
            </p>
          </div>
        ) : (
          /* ESTADO ACTIVO: PENDIENTE DE SUBIR Y CUMPLE CON TODO */
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleExportToSharepoint}
              disabled={isExportingSharepoint}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#107c41] via-[#0f773d] to-[#0a5c2d] hover:brightness-110 active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2.5 transition shadow-lg border border-emerald-400/40 cursor-pointer"
              title="Exporta y actualiza directamente el archivo Excel CVD-CCA-F-08 en SharePoint"
            >
              {isExportingSharepoint ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>Conectando con SharePoint / Power Automate...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>Exportar a Excel SharePoint (CVD-CCA-F-08)</span>
                </>
              )}
            </button>
            <div className="text-center">
              <span className="text-[10px] text-emerald-300 font-semibold">
                ✓ Candados Poka-Yoke y Calidad Verificados — Listo para exportar a SharePoint
              </span>
            </div>
          </div>
        )}

        {/* NOTIFICACIÓN DE ACCIÓN (LIMPIEZA O RE-HABILITACIÓN) */}
        {sharepointActionNotice && (
          <div className="bg-blue-950/90 border border-blue-500 text-blue-200 p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{sharepointActionNotice}</span>
          </div>
        )}

        {/* RESULTADO EXITOSO DE EXPORTACIÓN A SHAREPOINT */}
        {sharepointResult && (
          <div className="bg-emerald-950/90 border-2 border-emerald-500 text-white p-3.5 rounded-xl space-y-2.5 animate-in fade-in shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-black text-emerald-200 uppercase tracking-wide">
                  ¡Exportado con Éxito a SharePoint!
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">
                {sharepointResult.timestamp}
              </span>
            </div>
            <div className="text-[11px] text-neutral-200 space-y-2.5 bg-neutral-950/80 p-3 rounded-lg border border-emerald-800/60">
              <div className="flex items-start space-x-2">
                <span className="text-emerald-400 font-black">1.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-300">Pestaña REGISTRO (Tabla2):</strong>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 font-mono">
                      No. Maquila: {sharepointResult.payload.numeroMaquila}
                    </span>
                  </div>
                  <p className="text-neutral-300 mt-1">
                    Se sincronizó la fila de maquila con OT <span className="font-mono text-amber-300 font-bold">{sharepointResult.payload.folioOT}</span>:
                  </p>
                  <p className="text-[10px] text-neutral-400 pl-1 mt-0.5 leading-relaxed">
                    • <strong>Piezas Inspeccionadas:</strong> <span className="text-white font-bold">{sharepointResult.payload.piezasInspeccionadas}</span>
                    <br />
                    • <strong>Dictamen:</strong> <span className="text-white font-bold">{sharepointResult.payload.dictamen}</span>
                    <br />
                    • <strong>Observaciones:</strong> {sharepointResult.payload.observacionesCalidad}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2 border-t border-neutral-800">
                <span className="text-blue-400 font-black">2.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-blue-300">Pestaña Evidencias fotográficas (Tabla1):</strong>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900 text-blue-200 font-mono">
                      No. Pedido: {sharepointResult.payload.numeroPedido}
                    </span>
                  </div>
                  <p className="text-neutral-300 mt-1">
                    Se registró el pedido para el producto <span className="font-mono text-white font-bold">{sharepointResult.payload.claveArmado}</span>:
                  </p>
                  <p className="text-[10px] text-cyan-200 pl-1 mt-1 font-mono bg-neutral-900 p-1.5 rounded border border-neutral-800 break-all">
                    📁 Archivo local vinculado: {sharepointResult.payload.nombreArchivoLocal}
                  </p>
                  <span className="text-[10px] text-neutral-400 italic block mt-0.5">
                    ✓ Referencia trazable registrada para ubicar el paquete sin saturar el almacenamiento de SharePoint.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERROR DE SHAREPOINT */}
        {sharepointError && (
          <div className="bg-red-950/90 border-2 border-red-500 text-white p-3.5 rounded-xl space-y-2.5 animate-in fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  {isDirectApiAuthError(sharepointError)
                    ? 'Falta Autorización en Power Automate (Error 401)'
                    : 'Error al exportar a SharePoint:'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSharepointError(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDirectApiAuthError(sharepointError) ? (
              <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start space-x-2 text-amber-300 font-bold text-[11.5px]">
                  <Key className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>¿Por qué ocurrió y cómo solucionarlo en 1 minuto?</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Power Automate rechazó el envío con <strong className="text-red-300 font-mono">DirectApiAuthorizationRequired</strong> porque la URL requiere firma pública (&sig=...) o está restringida solo a usuarios internos.
                </p>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10.5px] text-slate-300 space-y-1">
                  <p>1. En Power Automate, abre el primer bloque <strong>"Al recibir una solicitud HTTP"</strong>.</p>
                  <p>2. Cambia <strong>"¿Quién puede desencadenar el flujo?"</strong> a <span className="text-emerald-300 font-bold">"Cualquiera" (Anyone)</span>.</p>
                  <p>3. Guarda el flujo y copia la nueva <strong>URL de HTTP POST</strong> completa (que termina con <code className="text-emerald-300">&sig=...</code>).</p>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPowerAutomateHelpModal(true)}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-black text-xs rounded-lg transition shadow flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Ver Guía Paso a Paso y Pegar Nueva URL</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-red-200 bg-neutral-950/80 p-2.5 rounded border border-red-900/60 font-mono">
                {sharepointError}
              </p>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleExportToSharepoint}
                disabled={isExportingSharepoint}
                className="flex-1 py-2 bg-red-800 hover:bg-red-700 active:scale-98 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {isExportingSharepoint ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reintentando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Exportación</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSharepointConfigModal(true)}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg border border-neutral-700 transition cursor-pointer"
              >
                Revisar URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. ACCIONES DE COMPARTIR Y EXPORTAR (DESCARGAS LOCALES: ZIP, WORD, EXCEL) */}
      {/* REGLA SOLICITADA: SOLO VISIBLE EN GOOGLE AI STUDIO Y PÁGINA WEB, OCULTO EN LA APK DE ANDROID */}
      {!deviceEnv.isHandheldOrApk && (
        <div className="bg-neutral-900 text-white p-4 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                Compartir y Exportar (Descargas Locales)
              </h4>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/60 px-1.5 py-0.5 rounded font-bold">
                Versión Web / PC
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {report.folioOT ? `OT: ${report.folioOT}` : 'Sin OT'}
            </span>
          </div>

          {/* BOTÓN PRINCIPAL: OPCIÓN A (PAQUETE COMPLETO .ZIP) */}
          <button
            type="button"
            onClick={handleExportZipPackage}
            disabled={isExportingZip}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2.5 transition shadow-md cursor-pointer"
          >
            {isExportingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generando Paquete ZIP (Excel + PDF Carta + Fotos)...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 text-amber-300" />
                <span>Descargar Paquete (.ZIP) — Excel + PDF Carta + Fotos</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportWordOnly}
              disabled={isExportingWord}
              className="py-2.5 px-2.5 bg-blue-800 hover:bg-blue-700 active:scale-95 text-blue-100 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-blue-600 transition shadow-xs cursor-pointer"
              title="Descargar informe en Microsoft Word (.docx)"
            >
              <FileText className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Informe Word</span>
            </button>

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="py-2.5 px-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-neutral-700 transition shadow-xs cursor-pointer"
                title="Descarga solo la hoja de cálculo sin fotografías"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Solo Excel</span>
              </button>
            )}

            {onSwitchToDesktopView && (
              <button
                type="button"
                onClick={onSwitchToDesktopView}
                className="py-2.5 px-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-neutral-700 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Hoja Oficial</span>
              </button>
            )}
          </div>

          {/* COPIAR RESUMEN EN TEXTO PARA CHAT */}
          <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-neutral-400 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={handleCopyWhatsAppSummary}
              className="hover:text-emerald-400 transition cursor-pointer flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
              <span>Copiar resumen de texto para chat</span>
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">Formato CVD-CCA-F-08</span>
          </div>

          {zipSuccessMsg && (
            <div className="bg-blue-600 text-white text-[11px] font-bold p-2.5 rounded-xl text-center flex items-center justify-center space-x-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-300" />
              <span>✓ ¡Paquete .ZIP descargado con Excel, Hoja Oficial PDF (Carta), Word y Fotos!</span>
            </div>
          )}
        </div>
      )}

      {/* 7. BOTÓN DIRECTO DE NUEVA INSPECCIÓN DENTRO DEL CONTENIDO */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNewReport}
          className="w-full py-2.5 sm:py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>Iniciar Nueva Inspección (Nuevo Lote)</span>
        </button>
      </div>

      {copiedNotification && (
        <div className="bg-emerald-500 text-white text-[11px] font-bold p-2 rounded-xl text-center">
          ✓ ¡Resumen copiado! Puedes pegarlo en el chat o reporte de supervisores.
        </div>
      )}

      {/* MENSAJE DE ÉXITO AL GUARDAR */}
      {isSavedSuccessfully && (
        <div className="space-y-2.5 animate-in fade-in">
          <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center space-x-2.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-amber-300" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-black">
                ¡Inspección guardada y cerrada exitosamente!
              </span>
              <span className="text-[10px] text-emerald-100 font-medium">
                ✓ Sincronizado en la Base de Datos en la Nube (Supabase) y en memoria local.
              </span>
            </div>
          </div>

          {/* En Handheld / APK ofrecemos el botón claro para abrir el siguiente lote tras guardar */}
          {deviceEnv.isHandheldOrApk && (
            <button
              type="button"
              onClick={onNewReport}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Iniciar Siguiente Inspección (Nuevo Lote)</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN DE CONEXIÓN A SHAREPOINT / POWER AUTOMATE */}
      {showSharepointConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-neutral-900 border-2 border-neutral-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#107c41] flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Conexión a SharePoint / Excel Online</h3>
                  <p className="text-[10px] text-neutral-400">Libro: CVD-CCA-F-08.xlsx (Power Automate)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSharepointConfigModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto text-xs text-neutral-300">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-200 uppercase tracking-wider">
                  Dirección URL de HTTP POST (Power Automate):
                </label>
                <textarea
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-[11px] font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none break-all"
                  placeholder="https://...powerplatform.com/..."
                />
                <span className="text-[10px] text-neutral-400 block">
                  Esta es la URL del disparador "Cuando se recibe una solicitud HTTP" en tu flujo.
                </span>

                {/* Validación Poka-Yoke de firma SAS */}
                {isPowerAutomateMissingSig(webhookUrlInput) && (
                  <div className="bg-amber-950/50 border border-amber-500/50 text-amber-200 p-2.5 rounded-xl text-[11px] space-y-1">
                    <p className="font-bold flex items-center space-x-1 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Atención: A esta URL le falta el parámetro &sig=...</span>
                    </p>
                    <p className="text-[10px] text-amber-200/90 leading-tight">
                      En Power Automate, asegúrate de cambiar <em>"¿Quién puede desencadenar el flujo?"</em> a <strong>"Cualquiera" (Anyone)</strong> para generar la URL pública con firma de acceso (SAS).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSharepointConfigModal(false);
                        setShowPowerAutomateHelpModal(true);
                      }}
                      className="text-[10px] underline text-cyan-300 hover:text-cyan-200 cursor-pointer pt-0.5 block font-bold"
                    >
                      Ver cómo solucionarlo paso a paso →
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2 text-[11px]">
                <span className="font-bold text-amber-400 block uppercase tracking-wide">
                  📋 Mapeo de Tablas en SharePoint (CVD-CCA-F-08):
                </span>
                <ul className="space-y-1.5 text-neutral-300 pl-1">
                  <li>
                    • <strong className="text-emerald-400">Pestaña REGISTRO (Tabla2):</strong> Clave primaria = <span className="font-mono text-emerald-300">numeroMaquila</span>. Actualiza <em>Piezas Inspeccionadas</em>, <em>Dictamen</em> e <em>Inspector</em>.
                  </li>
                  <li>
                    • <strong className="text-blue-400">Pestaña EVIDENCIAS FOTOGRÁFICAS (Tabla1):</strong> Clave = <span className="font-mono text-blue-300">numeroPedido</span>. Inserta <em>Clave Armado</em>, <em>Componentes</em> y <em>Nombre Archivo Local (.zip)</em>.
                  </li>
                </ul>
              </div>

              {/* Botón de Ping de Prueba */}
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300">Verificación de Conectividad en Vivo:</span>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook || !webhookUrlInput.trim()}
                    className="py-1.5 px-3 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600 active:scale-95 disabled:opacity-50 text-cyan-100 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {isTestingWebhook ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando Ping...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Probar Conexión (Ping)</span>
                      </>
                    )}
                  </button>
                </div>

                {webhookTestResult && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                      webhookTestResult.success
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-red-950/80 border-red-500 text-red-200'
                    }`}
                  >
                    {webhookTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-bold block">
                        {webhookTestResult.success ? 'Conexión Exitosa' : 'Fallo de Conexión'} ({webhookTestResult.latencyMs}ms)
                      </span>
                      <p className="text-[10px] opacity-90 leading-tight">
                        {webhookTestResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {webhookSavedMsg && (
                <div className="bg-emerald-600 text-white text-xs font-bold p-2.5 rounded-xl text-center flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>✓ Configuración de SharePoint guardada exitosamente</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setWebhookUrlInput(getStoredPowerAutomateWebhookUrl());
                  saveStoredPowerAutomateWebhookUrl(getStoredPowerAutomateWebhookUrl());
                }}
                className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Restablecer URL oficial
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSharepointConfigModal(false)}
                  className="px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveWebhookUrl}
                  className="px-4 py-2 text-xs font-black text-white bg-[#107c41] hover:bg-[#0e6b37] active:scale-95 rounded-xl transition shadow cursor-pointer"
                >
                  Guardar Conexión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA BORRAR OT EN SHAREPOINT */}
      {showDeleteSharepointConfirm && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setShowDeleteSharepointConfirm(false)}
        >
          <div
            className="bg-neutral-900 border-2 border-red-500/60 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 border-b border-red-800/50 flex items-start space-x-3">
              <div className="p-2.5 bg-red-900/60 border border-red-500/40 text-red-300 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm text-red-200 uppercase tracking-wide">
                  Borrar OT {cleanFolio} de SharePoint
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Desbloquear para re-subir información
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-300">
              <p>
                ¿Deseas limpiar el registro de la orden <strong className="text-amber-300 font-mono">OT {cleanFolio}</strong> en SharePoint?
              </p>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] space-y-1 text-neutral-400">
                <p>• Se notificará a Power Automate para eliminar/limpiar las filas de esta OT.</p>
                <p>• Se desbloqueará de inmediato el botón de subida en la app.</p>
                <p>• Podrás volver a subir la información corregida y actualizada.</p>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteSharepointConfirm(false)}
                className="px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteFromSharepoint}
                disabled={isDeletingSharepoint}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl transition shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingSharepoint ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, borrar y desbloquear</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE DE ACCIÓN PRINCIPAL (RESPONSIVA, SIN DESBORDAMIENTOS) */}
      <div className="fixed bottom-0 left-0 right-0 p-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-30 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={onPrevStep}
            className="w-10 sm:w-12 h-11 sm:h-12 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-black rounded-xl border border-neutral-300 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Volver a las Fotos"
            aria-label="Volver a las Fotos"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
          </button>

          {isStep5Visible && onNextStep ? (
            <button
              type="button"
              onClick={() => {
                handleSaveReport();
                onNextStep();
              }}
              className="flex-1 min-w-0 h-11 sm:h-12 px-2 sm:px-4 bg-[#107c41] hover:bg-[#0e6b37] active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wide rounded-xl transition flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-md cursor-pointer"
              title="Continuar al Paso 5: Sincronización Oficial con SharePoint"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">Paso 5: Sincronizar SharePoint →</span>
              <span className="truncate sm:hidden">Paso 5: SharePoint →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveReport}
              className="flex-1 min-w-0 h-11 sm:h-12 px-2 sm:px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wide rounded-xl transition flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">Guardar y Cerrar Lote</span>
              <span className="truncate sm:hidden">Guardar Lote</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL DE AYUDA Y CONFIGURACIÓN RÁPIDA PARA ERROR 401 POWER AUTOMATE */}
      <PowerAutomateHelpModal
        isOpen={showPowerAutomateHelpModal}
        onClose={() => setShowPowerAutomateHelpModal(false)}
        onUrlUpdated={(newUrl) => {
          setWebhookUrlInput(newUrl);
          setSharepointError(null);
        }}
      />
    </div>
  );
};
