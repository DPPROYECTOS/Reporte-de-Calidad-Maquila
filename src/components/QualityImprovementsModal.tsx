import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  PenTool, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Search, 
  Package, 
  Lock, 
  Check, 
  Info, 
  ListChecks,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

interface QualityImprovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QualityImprovementsModal: React.FC<QualityImprovementsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pasos' | 'semaforo' | 'fotos' | 'faq'>('pasos');
  const [selectedStep, setSelectedStep] = useState<1 | 2 | 3 | 4>(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden no-print">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ======================================================== */}
        {/* 1. ENCABEZADO: PROFESIONAL, CLARO Y ORIENTADOR           */}
        {/* ======================================================== */}
        <div className="flex-none bg-slate-950 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-md shrink-0 ring-1 ring-amber-300/40">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide truncate">
                  Guía Rápida de Inspección de Calidad
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 shadow-xs">
                  POKA-YOKE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                Flujo operativo estandarizado y prevención de errores en línea de producción
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition active:scale-95 shrink-0 cursor-pointer"
            aria-label="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. PESTAÑAS DE NAVEGACIÓN SUPERIOR                       */}
        {/* ======================================================== */}
        <div className="bg-slate-900 px-2 sm:px-4 py-2 border-b border-slate-800 flex-none overflow-x-auto no-scrollbar">
          <div className="flex space-x-1.5 sm:space-x-2 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('pasos')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                activeTab === 'pasos'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>1. Flujo Paso a Paso</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('semaforo')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                activeTab === 'semaforo'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>2. Semáforo y Candados</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fotos')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                activeTab === 'fotos'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>3. Evidencias Fotográficas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                activeTab === 'faq'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>4. Preguntas Frecuentes</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. CUERPO DE CONTENIDO CON DESPLAZAMIENTO FLUIDO         */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 text-slate-800">
          
          {/* ------------------------------------------------------ */}
          {/* TAB 1: LOS 4 PASOS DEL FLUJO OPERATIVO                 */}
          {/* ------------------------------------------------------ */}
          {activeTab === 'pasos' && (
            <div className="space-y-4">
              {/* Tarjeta de principio operativo */}
              <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 flex items-start space-x-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-black shrink-0">
                  ✨
                </div>
                <div className="text-xs leading-relaxed">
                  <strong className="text-amber-950 text-sm block font-black">
                    Flujo de Control Estandarizado
                  </strong>
                  <span className="text-amber-900">
                    El sistema guía la inspección en una secuencia ordenada del <strong>Paso 1 al Paso 4</strong>. Incorpora candados de validación automática que previenen el avance o cierre de lotes si falta información obligatoria o evidencias fotográficas.
                  </span>
                </div>
              </div>

              {/* Selectores de Paso 1, 2, 3, 4 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStep(1)}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col justify-between ${
                    selectedStep === 1
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                      : 'bg-white text-slate-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      selectedStep === 1 ? 'bg-amber-400 text-slate-950' : 'bg-neutral-200 text-slate-800'
                    }`}>
                      1
                    </span>
                    <Package className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="font-black text-xs mt-2">Paso 1: Lote</div>
                  <div className="text-[10px] opacity-75">Configurar orden</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStep(2)}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col justify-between ${
                    selectedStep === 2
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                      : 'bg-white text-slate-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      selectedStep === 2 ? 'bg-amber-400 text-slate-950' : 'bg-neutral-200 text-slate-800'
                    }`}>
                      2
                    </span>
                    <Search className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="font-black text-xs mt-2">Paso 2: Revisión</div>
                  <div className="text-[10px] opacity-75">Muestreo y defectos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStep(3)}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col justify-between ${
                    selectedStep === 3
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                      : 'bg-white text-slate-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      selectedStep === 3 ? 'bg-amber-400 text-slate-950' : 'bg-neutral-200 text-slate-800'
                    }`}>
                      3
                    </span>
                    <Camera className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="font-black text-xs mt-2">Paso 3: Fotos</div>
                  <div className="text-[10px] opacity-75">Evidencias requeridas</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStep(4)}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col justify-between ${
                    selectedStep === 4
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                      : 'bg-white text-slate-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      selectedStep === 4 ? 'bg-amber-400 text-slate-950' : 'bg-neutral-200 text-slate-800'
                    }`}>
                      4
                    </span>
                    <PenTool className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="font-black text-xs mt-2">Paso 4: Dictamen</div>
                  <div className="text-[10px] opacity-75">Firma y guardado</div>
                </button>
              </div>

              {/* Detalle del Paso Seleccionado */}
              <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 sm:p-5 shadow-sm space-y-3">
                {selectedStep === 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <h4 className="font-black text-sm sm:text-base">Paso 1: Configurar el Lote</h4>
                        <p className="text-xs text-neutral-500">Identificación de la orden, clave de producto y volumen</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">📝</span>
                        <div>
                          <strong>1. Número de Orden de Trabajo (OT):</strong> Registra el folio oficial correspondiente a la orden en producción.
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">📦</span>
                        <div>
                          <strong>2. Clave de Armado (SKU):</strong> Selecciona el código del producto o combo a inspeccionar. El sistema autocompleta la descripción oficial y asocia la matriz de defectos aplicable.
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">🔢</span>
                        <div>
                          <strong>3. Tamaño del Lote:</strong> Ingresa la cantidad total de unidades programadas para armado.
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-300 text-emerald-950 flex items-start space-x-2.5">
                        <span className="text-base">💡</span>
                        <div>
                          <strong>Cálculo Automático de Muestreo:</strong> La aplicación determina en tiempo real el tamaño de muestra requerido y los límites de aceptación/rechazo conforme a la tabla AQL (ANSI/ASQ Z1.4).
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStep(2)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                      >
                        <span>Continuar al Paso 2</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedStep === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <h4 className="font-black text-sm sm:text-base">Paso 2: Revisión Física (Muestreo de Piezas)</h4>
                        <p className="text-xs text-neutral-500">Evaluación visual y dimensional de las piezas muestreadas</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">🔍</span>
                        <div>
                          <strong>1. Muestreo Aleatorio:</strong> Toma físicamente la cantidad de piezas especificada en el cuadro de muestreo AQL.
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">🚨</span>
                        <div>
                          <strong>2. Registro de Defectos:</strong> Si se detecta alguna no conformidad física, cosmética o de empaque, incrementa el contador del defecto correspondiente (Crítico, Mayor o Menor).
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">✨</span>
                        <div>
                          <strong>3. Piezas Conformadas:</strong> Si el producto cumple al 100% las especificaciones, las piezas se registran como conformes de manera automática.
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-300 text-emerald-950 flex items-start space-x-2.5">
                        <span className="text-base">🛡️</span>
                        <div>
                          <strong>Protección Poka-Yoke:</strong> Si se registra un defecto Crítico (seguridad, componentes incompatibles o código errado), el sistema activa de inmediato la alerta de rechazo normativo (Ac = 0).
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedStep(1)}
                        className="px-3 py-2 bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl"
                      >
                        ← Volver al Paso 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStep(3)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                      >
                        <span>Continuar al Paso 3</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedStep === 3 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <h4 className="font-black text-sm sm:text-base">Paso 3: Evidencias Fotográficas</h4>
                        <p className="text-xs text-neutral-500">Captura de fotografías de trazabilidad técnica del lote</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">📸</span>
                        <div>
                          <strong>Cobertura de Fotografías Requeridas:</strong> Captura o adjunta las fotografías solicitadas en cada una de las casillas activas en pantalla. 
                          <span className="block mt-1 text-neutral-600">
                            La cantidad y el tipo de evidencias pueden variar según el tipo de producto, cliente o configuración del lote (por ejemplo: Inicio de mesa, Proceso en módulo, Pieza liberada, Tarima entarimada o evidencias adicionales).
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-amber-950 flex items-start space-x-2.5">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Candado de Evidencias:</strong> Para garantizar auditorías exitosas, el sistema requiere que todos los apartados fotográficos activos se encuentren completos antes de permitir la emisión del dictamen y firma en el Paso 4.
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedStep(2)}
                        className="px-3 py-2 bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl"
                      >
                        ← Volver al Paso 2
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStep(4)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                      >
                        <span>Continuar al Paso 4</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedStep === 4 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center">
                        4
                      </span>
                      <div>
                        <h4 className="font-black text-sm sm:text-base">Paso 4: Dictamen Final y Firma</h4>
                        <p className="text-xs text-neutral-500">Cierre técnico de la inspección con acreditación de personal</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">⚖️</span>
                        <div>
                          <strong>1. Dictamen Oficial Automático:</strong> El sistema dictamina matemáticamente el estatus del lote (<span className="text-emerald-700 font-black">APROBADO</span> o <span className="text-red-700 font-black">RECHAZADO</span>) según los criterios de muestreo AQL y defectos detectados.
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start space-x-2.5">
                        <span className="text-base">✍️</span>
                        <div>
                          <strong>2. Firma y Acreditación de Calidad:</strong> Selecciona en el catálogo al <strong>Inspector, Auditor o Responsable de Calidad</strong> asignado en la base de datos y estampa la firma digital en el panel táctil.
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-300 text-emerald-950 flex items-start space-x-2.5">
                        <span className="text-base">💾</span>
                        <div>
                          <strong>3. Guardar y Cerrar Lote:</strong> Al presionar el botón verde principal, la auditoría queda persistida en la nube y habilitada para su descarga oficial en formatos PDF Carta y Excel.
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedStep(3)}
                        className="px-3 py-2 bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl"
                      >
                        ← Volver al Paso 3
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Entendido, Continuar con la Inspección</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 2: SEMÁFORO Y CANDADOS DE VALIDACIÓN                */}
          {/* ------------------------------------------------------ */}
          {activeTab === 'semaforo' && (
            <div className="space-y-3">
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-1">
                <h4 className="font-black text-sm flex items-center space-x-2">
                  <span>🚦</span>
                  <span>Código de Colores y Gestión Visual</span>
                </h4>
                <p className="text-xs text-slate-300">
                  La interfaz utiliza indicadores cromáticos estandarizados para facilitar la toma de decisiones inmediata:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-950 font-black text-sm">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm" />
                    <span>VERDE = CONFORME</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Etapa validada, sin defectos limitantes o lote <strong>APROBADO</strong>. Habilita la transición a la siguiente fase operativa.
                  </p>
                </div>

                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-950 font-black text-sm">
                    <span className="w-4 h-4 rounded-full bg-amber-400 shadow-sm" />
                    <span>AMARILLO = PENDIENTE</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Aviso preventivo: faltan campos opcionales, evidencias fotográficas por completar o defectos menores dentro del límite permitido.
                  </p>
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-red-950 font-black text-sm">
                    <span className="w-4 h-4 rounded-full bg-red-600 shadow-sm" />
                    <span>ROJO = CANDADO / NO CONFORME</span>
                  </div>
                  <p className="text-xs text-red-900 leading-relaxed">
                    Bloqueo de seguridad preventivo por campo mandatorio incompleto o lote <strong>RECHAZADO</strong> por detección de defecto crítico.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-2.5">
                <h5 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Candados de Validación Integrados:</span>
                </h5>

                <div className="space-y-2 text-xs text-neutral-700">
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    🔒 <strong>Candado 1 (Datos de Orden):</strong> El acceso a la revisión física requiere número de OT y clave de producto definidos.
                  </div>
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    🔒 <strong>Candado 2 (Evidencias Fotográficas):</strong> El paso de dictamen final permanece bloqueado hasta completar todas las casillas fotográficas activas.
                  </div>
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    🔒 <strong>Candado 3 (Acreditación):</strong> El guardado y cierre del reporte exige la selección del inspector autorizado y la firma digital en pantalla.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 3: EVIDENCIAS FOTOGRÁFICAS                         */}
          {/* ------------------------------------------------------ */}
          {activeTab === 'fotos' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shrink-0">
                  📸
                </div>
                <div className="text-xs leading-relaxed">
                  <strong className="text-blue-950 text-sm block font-black">
                    Registro de Evidencias Fotográficas
                  </strong>
                  <span className="text-blue-900">
                    Las fotografías respaldan la conformidad del lote ante auditorías internas y de clientes. La interfaz presenta los recuadros de captura configurados para cada tipo de orden:
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">Inicio de Mesa / Módulo</h5>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Evidencia de la estación de armado despejada, componentes limpios e insumos correctos previo al ensamble.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">Proceso de Armado</h5>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Registro del personal operando en la mesa y aplicando los criterios de empaque y ensamblaje correspondientes.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">Pieza Liberada / Terminada</h5>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Detalle del combo finalizado con código de barras, sellos y componentes visibles en óptimas condiciones.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">Tarima Completa / Entarimado</h5>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Comprobación de estiba, emplayado, esquineros e identificación de tarima lista para entrega o almacén.
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-600 leading-relaxed flex items-start space-x-2">
                <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota sobre la configuración de fotos:</strong> Dependiendo del cliente, orden o requerimientos de calidad, los apartados fotográficos obligatorios pueden ampliarse o reducirse según las especificaciones técnicas del lote.
                </span>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 4: PREGUNTAS FRECUENTES Y DUDAS                     */}
          {/* ------------------------------------------------------ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border-2 border-neutral-300 p-4 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <span className="text-lg">❓</span>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">¿Se puede corregir un dato antes de cerrar el lote?</h5>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      Sí. Puedes navegar entre los pasos anteriores tocando los botones del encabezado o los controles de retroceso para ajustar cualquier dato, muestra o fotografía antes de la firma final.
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex items-start space-x-2.5">
                  <span className="text-lg">✍️</span>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">¿Quiénes están autorizados para firmar el dictamen?</h5>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      Cualquier <strong>Inspector, Auditor o Responsable de Calidad</strong> registrado en la base de datos del sistema puede seleccionar su nombre en la lista y plasmar su firma digital para validar la inspección.
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex items-start space-x-2.5">
                  <span className="text-lg">📦</span>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">¿Cómo se inicia la inspección de una nueva orden?</h5>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      En el Paso 4, al concluir la orden actual, presiona el botón principal <strong>"+ Iniciar Nueva Inspección (Nuevo Lote)"</strong>. El sistema resguardará el reporte concluido en el historial y preparará una plantilla en blanco en el Paso 1.
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex items-start space-x-2.5">
                  <span className="text-lg">🕒</span>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">¿Dónde se consultan las auditorías previas?</h5>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      En el botón de <strong>Historial</strong> (icono de reloj en la barra superior derecha) puedes revisar todas las órdenes registradas, consultar su dictamen o descargar copias del reporte.
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex items-start space-x-2.5">
                  <span className="text-lg">🖨️</span>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900">¿Cómo se descargan los reportes oficiales?</h5>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      Desde el Paso 4 o el Historial, cuentas con accesos directos para generar el expediente en <strong>PDF tamaño Carta</strong> y la hoja de cálculo en <strong>Excel</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* 4. FOOTER: SALIDA Y CONTINUIDAD OPERATIVA                */}
        {/* ======================================================== */}
        <div className="flex-none bg-white border-t border-neutral-200 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-500 font-medium hidden sm:flex">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sistema Poka-Yoke: Trazabilidad y control normativo de calidad.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>Entendido, Continuar con la Inspección</span>
          </button>
        </div>

      </div>
    </div>
  );
};
