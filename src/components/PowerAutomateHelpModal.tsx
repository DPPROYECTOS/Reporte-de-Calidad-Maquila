import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  ShieldAlert,
  Info,
  Key,
  FileSpreadsheet,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getStoredPowerAutomateWebhookUrl,
  saveStoredPowerAutomateWebhookUrl,
} from '../utils/appConfigStore';
import {
  testPowerAutomateWebhookConnection,
  isPowerAutomateMissingSig,
} from '../utils/sharepointExport';

interface PowerAutomateHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated?: (newUrl: string) => void;
}

export const PowerAutomateHelpModal: React.FC<PowerAutomateHelpModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated,
}) => {
  const [urlInput, setUrlInput] = useState<string>(() => getStoredPowerAutomateWebhookUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [isCopiedHelp, setIsCopiedHelp] = useState(false);
  const [isCopiedSchema, setIsCopiedSchema] = useState(false);
  const [showSchemaDetails, setShowSchemaDetails] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const powerAutomateSchemaJson = JSON.stringify(
    {
      type: 'object',
      properties: {
        accion: { type: 'string' },
        folioOT: { type: 'string' },
        numeroMaquila: { type: 'string' },
        numeroPedido: { type: 'string' },
        fecha: { type: 'string' },
        claveArmado: { type: 'string' },
        descripcionArmado: { type: 'string' },
        clavesIndividuales: { type: 'string' },
        piezasInspeccionadas: { type: 'integer' },
        observacionesCalidad: { type: 'string' },
        nombreArchivoLocal: { type: 'string' },
        dictamen: { type: 'string' },
        inspector: { type: 'string' },
      },
    },
    null,
    2
  );

  const copySchemaJson = () => {
    navigator.clipboard.writeText(powerAutomateSchemaJson);
    setIsCopiedSchema(true);
    setTimeout(() => setIsCopiedSchema(false), 2500);
  };

  if (!isOpen) return null;

  const isMissingSig = isPowerAutomateMissingSig(urlInput);
  const hasValidFormat = urlInput.trim().startsWith('http');
  const hasSig = urlInput.includes('sig=');

  const handleSave = () => {
    if (!urlInput.trim()) return;
    saveStoredPowerAutomateWebhookUrl(urlInput.trim());
    if (onUrlUpdated) {
      onUrlUpdated(urlInput.trim());
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestPing = async () => {
    if (!urlInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testPowerAutomateWebhookConnection(urlInput.trim());
      setTestResult(res);
      if (res.success) {
        saveStoredPowerAutomateWebhookUrl(urlInput.trim());
        if (onUrlUpdated) onUrlUpdated(urlInput.trim());
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Error al conectar con la URL especificada.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyInstructions = () => {
    const text = `GUÍA DE SOLUCIÓN: ERROR 401 (DirectApiAuthorizationRequired) EN POWER AUTOMATE
1. Ingresa a make.powerautomate.com y abre tu flujo CVD-CCA-F-08.
2. Abre el desencadenador "Al recibir una solicitud HTTP" (When an HTTP request is received).
3. En "¿Quién puede desencadenar el flujo?" (Who can trigger the flow), cambia a "Cualquiera" (Anyone).
4. Haz clic en Guardar (Save).
5. Copia la nueva Dirección URL de HTTP POST (debe terminar con &sp=...&sv=...&sig=...).
6. Pega la URL completa en la aplicación de Calidad y prueba la conexión.`;
    navigator.clipboard.writeText(text);
    setIsCopiedHelp(true);
    setTimeout(() => setIsCopiedHelp(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border-2 border-red-500/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 font-sans">
        
        {/* Encabezado */}
        <div className="p-4 bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-b border-red-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-900/60 border border-red-500/50 text-red-300 rounded-xl shrink-0 shadow-lg">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-base text-white uppercase tracking-wide">
                  Solución al Error 401 de Power Automate
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  DirectApiAuthorizationRequired
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cómo habilitar la recepción de datos desde la app de calidad
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

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

          {/* 1. Diagnóstico del Error */}
          <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-red-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>¿Por qué apareció este error?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11.5px]">
              Microsoft Power Automate rechazó la petición con el código <strong className="text-red-300 font-mono">DirectApiAuthorizationRequired</strong> (Error 401). Esto ocurre porque el desencadenador del flujo tiene activada por defecto la opción restrictiva <em className="text-amber-200">"Cualquier usuario de mi inquilino"</em> (la cual exige inicio de sesión con Microsoft Entra ID) <strong>O</strong> porque al copiar la URL faltó la clave de firma digital (<span className="text-emerald-300 font-mono">&sig=...</span>).
            </p>
          </div>

          {/* 2. Solución Paso a Paso */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Pasos para corregirlo en Power Automate (1 minuto):</span>
              </div>
              <button
                type="button"
                onClick={copyInstructions}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {isCopiedHelp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar pasos</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 text-[11.5px] text-slate-300">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-amber-500/40">
                  1
                </span>
                <p>
                  Abre tu flujo en <strong>Microsoft Power Automate</strong>:{' '}
                  <a
                    href="https://make.powerautomate.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center space-x-1"
                  >
                    <span>make.powerautomate.com</span>
                    <ExternalLink className="w-3 h-3 inline ml-0.5" />
                  </a>
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-amber-500/40">
                  2
                </span>
                <p>
                  Haz clic en el primer bloque:{' '}
                  <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10.5px]">
                    Al recibir una solicitud HTTP
                  </strong>{' '}
                  (<em>When an HTTP request is received</em>).
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-emerald-500/40">
                  3
                </span>
                <p>
                  En el parámetro{' '}
                  <strong className="text-amber-300">"¿Quién puede desencadenar el flujo?"</strong>{' '}
                  (<em>Who can trigger the flow</em>), cámbialo a{' '}
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded font-bold">
                    Cualquiera (Anyone)
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-amber-500/40">
                  4
                </span>
                <p>
                  Haz clic en <strong className="text-white font-bold">Guardar</strong> (Save) arriba a la derecha.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-amber-500/40">
                  5
                </span>
                <p>
                  Al guardar, Power Automate generará una nueva{' '}
                  <strong className="text-white">"Dirección URL de HTTP POST"</strong>. Fíjate que al final contenga la firma:{' '}
                  <code className="text-emerald-300 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">
                    &sp=/triggers/manual/run&sv=1.0&sig=...
                  </code>
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-amber-500/40">
                  6
                </span>
                <p>
                  Copia esa URL completa, pégala aquí abajo y haz clic en <strong className="text-emerald-300">Guardar URL</strong> y luego en <strong className="text-cyan-300">Probar Conexión (Ping)</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Esquema JSON del Desencadenador (13 Campos Alineados) */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Esquema JSON del Flujo (13 Campos Confirmados)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  100% Sincronizado
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={copySchemaJson}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer border border-slate-700"
                >
                  {isCopiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Esquema</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchemaDetails(!showSchemaDetails)}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Ver campos"
                >
                  {showSchemaDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              La app genera y envía exactamente estos 13 datos con sus tipos correspondientes (<strong className="text-slate-200">12 cadenas de texto</strong> y <strong className="text-amber-300">1 número entero</strong> en <code className="text-amber-300 font-mono">piezasInspeccionadas</code>).
            </p>

            {showSchemaDetails && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10.5px] font-mono">
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">accion</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">folioOT</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">numeroMaquila</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-blue-400 font-bold">numeroPedido</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">fecha</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">claveArmado</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">descripcionArmado</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">clavesIndividuales</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-amber-950/40 p-1.5 rounded border border-amber-500/40">
                    <span className="text-amber-300 font-bold">piezasInspeccionadas</span> <span className="text-amber-400">: integer</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold">observacionesCalidad</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">nombreArchivoLocal</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">dictamen</span> <span className="text-slate-500">: string</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-purple-400 font-bold">inspector</span> <span className="text-slate-500">: string</span>
                  </div>
                </div>

                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800 max-h-40 overflow-y-auto">
                  <pre className="text-[10px] text-slate-300 font-mono">
                    {powerAutomateSchemaJson}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* 4. Input de Configuración de la URL */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-200">
              Pega aquí la nueva Dirección URL de HTTP POST completa:
            </label>
            <textarea
              rows={3}
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://default...powerplatform.com/.../invoke?api-version=1&sp=...&sv=1.0&sig=..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-emerald-400 font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none break-all"
            />

            {/* Validación en Tiempo Real */}
            {hasValidFormat && (
              <div>
                {hasSig ? (
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      ✓ <strong>Firma digital detectada (&sig=...)</strong>. Esta URL tiene permiso público y no será rechazada con error 401.
                    </span>
                  </div>
                ) : isMissingSig ? (
                  <div className="flex items-start space-x-2 text-amber-300 text-xs bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong className="block font-bold">⚠️ Falta el parámetro &sig=...</strong>
                      <span>
                        Esta URL no tiene la firma pública. Asegúrate de haber cambiado en Power Automate la opción a <strong>"Cualquiera" (Anyone)</strong>, guardar el flujo y copiar la URL completa.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Botones de Guardar y Ping */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={!urlInput.trim()}
                className="py-2 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs cursor-pointer flex items-center space-x-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                <span>Guardar URL</span>
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting || !urlInput.trim()}
                className="py-2 px-4 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600 disabled:opacity-50 text-cyan-100 font-bold rounded-xl transition text-xs cursor-pointer flex items-center space-x-1.5 shadow"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Probando conexión...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-300" />
                    <span>Probar Conexión (Ping)</span>
                  </>
                )}
              </button>

              {saveSuccess && (
                <span className="text-emerald-400 text-xs font-bold animate-in fade-in">
                  ✓ ¡URL guardada con éxito!
                </span>
              )}
            </div>

            {/* Resultado de la prueba */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/90 border-red-500 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="font-bold block">
                    {testResult.success
                      ? `✓ ¡Conexión Exitosa con Power Automate! (${testResult.latencyMs}ms)`
                      : 'Fallo al Conectar con Power Automate'}
                  </span>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5" />
            <span>El libro oficial SharePoint es <strong>CVD-CCA-F-08.xlsx</strong></span>
          </div>
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
