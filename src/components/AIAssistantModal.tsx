import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, Copy, Check, ShieldCheck } from 'lucide-react';
import { QualityReport } from '../types/qualityReport';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport;
  onApplyText: (type: 'observaciones' | 'planDeAccion', text: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyText,
}) => {
  const [promptPreset, setPromptPreset] = useState<string>('observaciones');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg('');
    setAiResult('');

    let promptText = '';
    if (promptPreset === 'observaciones') {
      promptText = `Redacta un texto de observaciones técnicas para el reporte de calidad de maquila CV Directo (CVD-CCA-F-08).
Datos del lote:
- OT: ${report.folioOT}
- Cliente: ${report.cliente}
- Clave/SKU: ${report.skuArmado} (${report.descripcionArmado})
- Lote total N: ${report.totalLotSize} pz
- Muestra AQL n: ${report.sampleSizeInspected} pz
- Estado: ${report.status}
- Defectos detectados: ${report.totalDefectives} pz (${report.defectItems.filter(i => !i.passed).map(i => `${i.name}: ${i.defectsFound} pz`).join(', ') || 'Sin defectos mayores'})
- Límite Ac: ${report.acLimit}, Re: ${report.reLimit}

Escribe un párrafo formal, directo y profesional justificando el dictamen según procedimiento CVD-AMA-PR-01.`;
    } else if (promptPreset === 'planDeAccion') {
      promptText = `Redacta un Plan de Acción y Corrección Técnica para una orden de maquila de CV Directo que está en estado ${report.status}.
Datos: OT ${report.folioOT}, SKU ${report.skuArmado}, Cliente ${report.cliente}, Defectos: ${report.totalDefectives} pz.
Proporciona 3 o 4 pasos numerados concretos (Ej. traslado a Cuarentena, etiquetado rojo, resurtido de insumos faltantes en menos de 40 min, re-inspección al 100%).`;
    } else {
      promptText = customPrompt || `Sugiéreme mejoras de calidad para la OT ${report.folioOT} del cliente ${report.cliente}.`;
    }

    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en la respuesta del servidor AI');
      }

      setAiResult(data.text || 'No se recibió texto generado.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error al consultar a Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden no-print font-sans">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-300 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header - Fixed */}
        <div className="flex-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-md shadow-amber-500/20 shrink-0 ring-1 ring-amber-300/40">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide break-words">
                  Asistente de Redacción
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0">
                  NORMATIVA
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 flex-wrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">Redacción Técnica</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Observaciones y Planes de Acción</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white p-2 rounded-xl border border-slate-700/60 transition active:scale-95 shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 text-xs bg-[#FAF9F6]">
          {/* Preset options */}
          <div className="space-y-2">
            <label className="block font-black text-[#1A1A1A] uppercase tracking-wider text-[10px]">
              ¿Qué necesitas generar?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-sans text-xs">
              <button
                type="button"
                onClick={() => setPromptPreset('observaciones')}
                className={`p-2.5 sm:p-3 rounded-xl border-2 text-left font-bold transition active:scale-98 shadow-xs ${
                  promptPreset === 'observaciones'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-900'
                }`}
              >
                📝 Observaciones Dictamen
              </button>

              <button
                type="button"
                onClick={() => setPromptPreset('planDeAccion')}
                className={`p-2.5 sm:p-3 rounded-xl border-2 text-left font-bold transition active:scale-98 shadow-xs ${
                  promptPreset === 'planDeAccion'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-900'
                }`}
              >
                🛠️ Plan de Acción
              </button>

              <button
                type="button"
                onClick={() => setPromptPreset('custom')}
                className={`p-2.5 sm:p-3 rounded-xl border-2 text-left font-bold transition active:scale-98 shadow-xs ${
                  promptPreset === 'custom'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-900'
                }`}
              >
                💬 Consulta Libre
              </button>
            </div>
          </div>

          {/* Custom prompt if selected */}
          {promptPreset === 'custom' && (
            <div>
              <label className="block text-[#1A1A1A] mb-1 font-black uppercase tracking-wider text-[10px]">
                Escribe tu instrucción técnica:
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ej. Redacta una justificación técnica para concesión de empaque con cinta transparente..."
                rows={3}
                className="w-full bg-white border-2 border-neutral-300 rounded-xl p-3 text-xs text-[#1A1A1A] focus:outline-none focus:border-neutral-900"
              />
            </div>
          )}

          {/* Action trigger */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 shadow-xs active:scale-98"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Generando con Gemini AI...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-300" />
                <span>Generar Redacción Técnica</span>
              </>
            )}
          </button>

          {/* Error display */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-red-900 text-xs">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* Result area */}
          {aiResult && (
            <div className="bg-neutral-950 text-white p-3.5 sm:p-4 rounded-2xl border border-neutral-800 space-y-3 font-sans shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs border-b border-neutral-800 pb-2.5">
                <span className="font-bold text-amber-300 flex items-center space-x-1.5 uppercase text-[10px] tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sugerencia Redactada por IA</span>
                </span>

                <div className="flex items-center flex-wrap gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 text-[10px] uppercase font-bold transition active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>

                  {promptPreset === 'observaciones' && (
                    <button
                      onClick={() => {
                        onApplyText('observaciones', aiResult);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition active:scale-95 shadow-xs"
                    >
                      Aplicar a Observaciones
                    </button>
                  )}

                  {promptPreset === 'planDeAccion' && (
                    <button
                      onClick={() => {
                        onApplyText('planDeAccion', aiResult);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition active:scale-95 shadow-xs"
                    >
                      Aplicar a Plan de Acción
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
                {aiResult}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex-none bg-white border-t border-neutral-200 p-3 sm:px-6 sm:py-3 flex justify-end font-sans">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-xl transition text-center active:scale-98"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
