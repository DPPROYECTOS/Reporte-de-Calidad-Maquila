import React from 'react';
import { X, CheckCircle, ShieldCheck, Sparkles, AlertCircle, FileSpreadsheet, Camera, ClipboardCheck } from 'lucide-react';

interface QualityImprovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QualityImprovementsModal: React.FC<QualityImprovementsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden no-print">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-300 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header - Fixed */}
        <div className="flex-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-md shadow-amber-500/20 shrink-0 ring-1 ring-amber-300/40">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide break-words">
                  ¿Qué más debe tener el Reporte de Calidad?
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0">
                  POKA-YOKE
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 flex-wrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">CVD-AMA-PR-01</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">7 Módulos de Control Normativo</span>
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

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 text-xs text-[#1A1A1A] bg-[#FAF9F6]">
          <div className="bg-white border border-[#1A1A1A] p-4 text-xs text-[#1A1A1A] flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Diagnóstico del Formato Original:</strong> El borrador inicial solo registraba datos básicos de horario e inspector. Para cumplir con auditorías de calidad, trazabilidad en ERP Oracle y prevención de garantías de clientes (Coppel, Amazon, Mercado Libre), hemos enriquecido el formato con los siguientes 7 módulos indispensables.
            </div>
          </div>

          {/* 7 Core Improvement Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Point 1 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span className="leading-snug break-words">Calculadora AQL ANSI/ASQ Z1.4 (Tabla Anexo 8)</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Determina automáticamente la Letra Código, el tamaño de muestra requerida (n) y los límites matemáticos de Aceptación (Ac) y Rechazo (Re) basados en un AQL de 1.5% Nivel II. Elimina el sesgo humano.
              </p>
            </div>

            {/* Point 2 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span className="leading-snug break-words">Lista de Control de Defectos por Categoría</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Inspección estructurada según el Manual CVD-AMA-M-01: <strong>Empaque y Cajas</strong>, <strong>Etiquetado y Barcode</strong>, <strong>Armado de Combos</strong>, <strong>Antiadherente Cosmético</strong> y <strong>Patrón de Estiba</strong>.
              </p>
            </div>

            {/* Point 3 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span className="leading-snug break-words">Clasificación por Severidad de Defectos</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Diferencia entre defectos <strong>Críticos</strong> (seguridad/SKU incorrecto - Ac = 0), <strong>Mayores</strong> (faltante de accesorios/código ilegible) y <strong>Menores</strong> (detalles cosméticos).
              </p>
            </div>

            {/* Point 4 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <span className="leading-snug break-words">Secuencia Obligatoria de Evidencia Fotográfica</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Exige el cumplimiento de las 4 fotos normativas requeridas en el punto 6.2 del procedimiento: (1) Foto Inicio, (2) Foto Proceso en Módulo, (3) Foto Pieza Liberada, y (4) Foto Tarima Entarimada.
              </p>
            </div>

            {/* Point 5 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
                <span className="leading-snug break-words">Protocolo SLA de Producto No Conforme (&lt; 40 min)</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Si el lote es Rechazado, activa la bandera de traslado obligatorio a <strong>Área de Cuarentena</strong>, etiquetado Rojo y compromiso de notificación escrita a Gerencia de Almacén F en menos de 40 minutos.
              </p>
            </div>

            {/* Point 6 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">6</span>
                <span className="leading-snug break-words">Trazabilidad de Clave Compuesta y Módulo</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Registra la clave final del combo (ej. C0361-02), el desglose de claves origen de insumos (ej. C0359-00/C0360-00), el Módulo de Maquila responsable y el nombre del encargado de mesa.
              </p>
            </div>

            {/* Point 7 */}
            <div className="bg-white border border-[#1A1A1A] p-4 space-y-2 col-span-1 md:col-span-2">
              <div className="flex items-start space-x-2 text-[#1A1A1A] font-bold text-xs uppercase tracking-wider">
                <span className="bg-[#1A1A1A] text-white w-5 h-5 font-mono flex items-center justify-center text-[10px] shrink-0 mt-0.5">7</span>
                <span className="leading-snug break-words">Tres Firmas de Conformidad (Triple Cierre Operativo)</span>
              </div>
              <p className="text-neutral-700 text-xs leading-relaxed break-words">
                Triple validación con firma y hora exacta: <strong>(1) Inspector de Calidad</strong> que dictamina, <strong>(2) Supervisor de Maquila</strong> que entrega la tarima, y <strong>(3) Almacén PT</strong> que asigna el localizador físico en racks.
              </p>
            </div>
          </div>

          {/* Print Letter Format & Excel Export Note */}
          <div className="bg-emerald-50 border border-emerald-400 p-4 text-emerald-950 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-800 shrink-0" />
              <span className="text-xs">
                <strong>Formato Listo en Tamaño Carta e Exportación Excel:</strong> Renderizado con maquetación en cuadrícula idéntica a una hoja de Excel, lista para imprimir directamente a PDF en papel carta sin cortes.
              </span>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-none bg-white border-t border-neutral-200 p-3 sm:px-6 sm:py-3 flex justify-end font-sans">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition text-center shadow-xs active:scale-98"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
