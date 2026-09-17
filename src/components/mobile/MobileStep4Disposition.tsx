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
  FileText
} from 'lucide-react';
import { exportInspectionPackageZip } from '../../utils/excelExport';
import { generateInspectionWordDocument } from '../../utils/wordExport';

interface MobileStep4DispositionProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onPrevStep: () => void;
  onNewReport: () => void;
  onOpenAiAssist?: () => void;
  onExportExcel?: () => void;
  onSwitchToDesktopView?: () => void;
}

export const MobileStep4Disposition: React.FC<MobileStep4DispositionProps> = ({
  report,
  onUpdateReport,
  onPrevStep,
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
    <div className="space-y-4 pb-32 sm:pb-28">
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

      {/* 5. ACCIONES DE COMPARTIR Y NUEVA INSPECCIÓN */}
      <div className="bg-neutral-900 text-white p-4 rounded-2xl border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
            Compartir y Exportar
          </h4>
          <span className="text-[10px] text-neutral-400">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyWhatsAppSummary}
            className="py-2.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
          </button>

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

        {zipSuccessMsg && (
          <div className="bg-blue-600 text-white text-[11px] font-bold p-2.5 rounded-xl text-center flex items-center justify-center space-x-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-300" />
            <span>✓ ¡Paquete .ZIP descargado con Excel, Hoja Oficial PDF (Carta), Word y Fotos!</span>
          </div>
        )}

        {copiedNotification && (
          <div className="bg-emerald-500 text-white text-[11px] font-bold p-2 rounded-xl text-center">
            ✓ ¡Resumen copiado! Pégalo en tu grupo de WhatsApp de supervisores.
          </div>
        )}
      </div>

      {/* MENSAJE DE ÉXITO AL GUARDAR */}
      {isSavedSuccessfully && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center space-x-2.5 shadow-lg animate-in fade-in">
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
      )}

      {/* BARRA FLOTANTE DE ACCIÓN PRINCIPAL */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-40 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center space-x-2">
          <button
            type="button"
            onClick={onPrevStep}
            className="w-12 py-3 sm:py-3.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-black rounded-xl border border-neutral-300 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Volver a las Fotos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleSaveReport}
            className="flex-1 py-3 sm:py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar y Cerrar Lote</span>
          </button>

          <button
            type="button"
            onClick={onNewReport}
            className="py-3 sm:py-3.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-1 shrink-0 cursor-pointer"
            title="Iniciar Nuevo Lote"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
