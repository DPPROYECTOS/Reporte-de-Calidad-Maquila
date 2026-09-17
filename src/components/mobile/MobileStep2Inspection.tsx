import React, { useState } from 'react';
import { QualityReport, DefectCheckItem, DefectSeverity } from '../../types/qualityReport';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  Lock,
  Check,
  AlertCircle,
  Layers,
  Settings,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ComboDefectManager } from '../ComboDefectManager';

interface MobileStep2InspectionProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenComboDefectsModal?: () => void;
}

export const MobileStep2Inspection: React.FC<MobileStep2InspectionProps> = ({
  report,
  onUpdateReport,
  onNextStep,
  onPrevStep,
  onOpenComboDefectsModal,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('TODAS');
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<'TODOS' | DefectSeverity>('TODOS');
  const [showComboDefectsManager, setShowComboDefectsManager] = useState<boolean>(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Recalculate totals and auto-evaluate status
  const updateDefectItem = (id: string, delta: number) => {
    const updatedItems = report.defectItems.map((item) => {
      if (item.id === id) {
        const newCount = Math.max(0, item.defectsFound + delta);
        return {
          ...item,
          defectsFound: newCount,
          passed: newCount === 0,
        };
      }
      return item;
    });

    let totalCritical = 0;
    let totalMajor = 0;
    let totalMinor = 0;
    let totalDefectives = 0;

    updatedItems.forEach((item) => {
      if (item.defectsFound > 0) {
        totalDefectives += item.defectsFound;
        if (item.severity === 'Critico') totalCritical += item.defectsFound;
        if (item.severity === 'Mayor') totalMajor += item.defectsFound;
        if (item.severity === 'Menor') totalMinor += item.defectsFound;
      }
    });

    // If sampleSizeInspected is 0, auto-set to required sample size since defects were found
    const currentInspected = report.sampleSizeInspected > 0 
      ? report.sampleSizeInspected 
      : (report.sampleSizeRequired || 50);

    // Poka-Yoke Automatic Decision Rule:
    let newStatus = report.status;
    let newTagColor = report.tagColor;

    if (totalCritical > 0 || totalDefectives >= report.reLimit) {
      newStatus = 'RECHAZADO';
      newTagColor = 'Roja';
    } else if (totalDefectives <= report.acLimit) {
      newStatus = 'APROBADO';
      newTagColor = 'Verde';
    } else {
      newStatus = 'CONDICIONADO';
      newTagColor = 'Amarilla';
    }

    const defectRate = report.sampleSizeRequired > 0 
      ? Number(((totalDefectives / report.sampleSizeRequired) * 100).toFixed(1))
      : 0;

    onUpdateReport({
      ...report,
      sampleSizeInspected: currentInspected,
      defectItems: updatedItems,
      totalCritical,
      totalMajor,
      totalMinor,
      totalDefectives,
      defectRatePercentage: defectRate,
      status: newStatus,
      tagColor: newTagColor,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSetDescription = (id: string, description: string) => {
    const updatedItems = report.defectItems.map((item) => {
      if (item.id === id) {
        return { ...item, description };
      }
      return item;
    });
    onUpdateReport({
      ...report,
      defectItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // One-touch Poka-yoke "Todo conforme (0 defectos)": Sets sampleSizeInspected to required, resets defects, unlocks step 3
  const handleMarkAllPerfect = () => {
    const requiredSize = report.sampleSizeRequired > 0 ? report.sampleSizeRequired : 50;
    const updatedItems = report.defectItems.map((item) => ({
      ...item,
      defectsFound: 0,
      passed: true,
      description: '',
    }));

    onUpdateReport({
      ...report,
      sampleSizeInspected: requiredSize,
      defectItems: updatedItems,
      totalCritical: 0,
      totalMajor: 0,
      totalMinor: 0,
      totalDefectives: 0,
      defectRatePercentage: 0,
      status: 'APROBADO',
      tagColor: 'Verde',
      updatedAt: new Date().toISOString(),
    });
  };

  // Adjust pieces physically inspected manually
  const handleAdjustInspected = (delta: number) => {
    const current = report.sampleSizeInspected || 0;
    const next = Math.max(0, current + delta);
    onUpdateReport({
      ...report,
      sampleSizeInspected: next,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleConfirmSampleSize = () => {
    const required = report.sampleSizeRequired || 50;
    onUpdateReport({
      ...report,
      sampleSizeInspected: required,
      updatedAt: new Date().toISOString(),
    });
  };

  // Categories list
  const categories = [
    'TODAS',
    'Empaque y Cajas',
    'Etiquetado y Códigos',
    'Armado y Componentes',
    'Apariencia Físico-Cosmética',
    'Estiba y Paletizado'
  ];

  const filteredItems = report.defectItems.filter((i) => {
    const matchCategory = activeCategoryFilter === 'TODAS' || i.category === activeCategoryFilter;
    const matchSeverity = activeSeverityFilter === 'TODOS' || i.severity === activeSeverityFilter;
    return matchCategory && matchSeverity;
  });

  // Status visual states
  const isApproved = report.status === 'APROBADO';
  const isRejected = report.status === 'RECHAZADO';
  const isConditional = report.status === 'CONDICIONADO';

  // CANDADO POKA-YOKE: Must have inspected pieces > 0
  const isInspectionCompleted = Boolean(report.sampleSizeInspected && report.sampleSizeInspected > 0);

  return (
    <div className="space-y-4 pb-32 sm:pb-28">
      {/* 1. SEMÁFORO EN VIVO */}
      <div
        className={`p-4 rounded-2xl border-2 shadow-sm transition-all ${
          !isInspectionCompleted
            ? 'bg-neutral-800 text-white border-neutral-900'
            : isApproved
            ? 'bg-emerald-600 text-white border-emerald-700'
            : isRejected
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-amber-500 text-neutral-950 border-amber-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {!isInspectionCompleted ? (
              <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
            ) : isApproved ? (
              <CheckCircle2 className="w-7 h-7 text-white shrink-0" />
            ) : isRejected ? (
              <XCircle className="w-7 h-7 text-white shrink-0 animate-bounce" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-neutral-950 shrink-0" />
            )}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-90">
                Semáforo de Inspección en Tiempo Real
              </div>
              <div className="text-lg sm:text-xl font-black tracking-wide leading-none mt-0.5">
                {!isInspectionCompleted
                  ? 'EN ESPERA DE INSPECCIÓN (RESET)'
                  : isApproved
                  ? 'LOTE APROBADO (ETIQUETA VERDE)'
                  : isRejected
                  ? 'LOTE RECHAZADO (ETIQUETA ROJA)'
                  : 'CONDICIONADO (ETIQUETA AMARILLA)'}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de conteo de piezas malas */}
        <div className="mt-3 bg-black/20 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold">
          <div>
            <span>Defectos encontrados: </span>
            <span className="font-mono font-black text-sm bg-white/30 px-2 py-0.5 rounded-md ml-1">
              {report.totalDefectives}
            </span>
          </div>
          <div className="text-[11px] opacity-90">
            Límite Ac: <strong className="font-mono">{report.acLimit} pzas</strong> | Rechazo: <strong className="font-mono">{report.reLimit}+ pzas</strong>
          </div>
        </div>

        {isRejected && (
          <div className="mt-2 text-xs bg-white/20 p-2 rounded-lg font-bold flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Atención: Lote supera límite AQL. Se requerirá plan de acción y cuarentena.</span>
          </div>
        )}
      </div>

      {/* 2. CONTROL POKA-YOKE: REGISTRO DE MUESTRA FÍSICAMENTE INSPECCIONADA */}
      <div className={`p-4 rounded-2xl border-2 shadow-xs transition ${
        isInspectionCompleted 
          ? 'bg-white border-emerald-300' 
          : 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/50'
      }`}>
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
              Control de Muestreo Físico: <span className="text-red-500">*</span>
            </h3>
          </div>
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border font-mono ${
            isInspectionCompleted 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {isInspectionCompleted ? '✓ Muestra Registrada' : '❌ Pendiente (Reset)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="text-[10px] font-bold text-neutral-500 uppercase block">
              Muestra Requerida por Norma AQL:
            </span>
            <div className="text-xl font-black font-mono text-neutral-900 mt-0.5">
              {report.sampleSizeRequired} piezas
            </div>
            <span className="text-[10px] text-neutral-500">
              Nivel: {report.inspectionLevel} | Letra: {report.codeLetter}
            </span>
          </div>

          <div className={`p-3 rounded-xl border-2 flex items-center justify-between ${
            isInspectionCompleted 
              ? 'bg-emerald-50 border-emerald-300' 
              : 'bg-white border-amber-400'
          }`}>
            <div>
              <span className="text-[10px] font-bold text-neutral-700 uppercase block">
                Piezas Inspeccionadas:
              </span>
              <div className="text-2xl font-black font-mono text-neutral-950 mt-0.5">
                {report.sampleSizeInspected || 0} <span className="text-xs font-sans font-bold text-neutral-500">pz</span>
              </div>
            </div>

            {/* Ajuste manual de piezas inspeccionadas */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleAdjustInspected(-5)}
                disabled={report.sampleSizeInspected === 0}
                className="w-8 h-8 rounded-lg bg-white border border-neutral-300 font-bold text-xs flex items-center justify-center disabled:opacity-30 active:scale-95"
                title="Restar 5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => handleAdjustInspected(5)}
                className="w-8 h-8 rounded-lg bg-white border border-neutral-300 font-bold text-xs flex items-center justify-center active:scale-95"
                title="Sumar 5"
              >
                +5
              </button>
            </div>
          </div>
        </div>

        {/* Botón de Confirmación Rápida de Inspección Conforme */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleMarkAllPerfect}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-sm border border-emerald-500"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>✓ Confirmar Muestra Completa de {report.sampleSizeRequired} Piezas Conforme (0 Defectos)</span>
          </button>

          {!isInspectionCompleted && (
            <div className="bg-amber-100/70 border border-amber-300 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Candado Poka-Yoke Paso 2:</strong> Este paso inicia en reset. Si la muestra estuvo perfecta, pulsa el botón verde arriba. Si encontraste defectos, usa los botones (+) en los criterios de abajo.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. FILTROS Y CONFIGURACIÓN DE DEFECTOS DEL COMBO */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
            Defectos a Evaluar en este Combo:
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenComboDefectsModal) {
                onOpenComboDefectsModal();
              } else {
                setShowComboDefectsManager(!showComboDefectsManager);
              }
            }}
            className="text-xs font-bold text-neutral-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center space-x-1 transition active:scale-95 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-amber-800" />
            <span>🧩 Matriz de Defectos (Ventana)</span>
          </button>
        </div>

        {/* Panel Desplegable de Respaldo */}
        {showComboDefectsManager && !onOpenComboDefectsModal && (
          <div className="animate-in fade-in">
            <ComboDefectManager report={report} onUpdateReport={onUpdateReport} />
          </div>
        )}

        {/* Filtros de Severidad (Críticos, Mayores, Menores) */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <button
            type="button"
            onClick={() => setActiveSeverityFilter('TODOS')}
            className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition ${
              activeSeverityFilter === 'TODOS'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Todos ({report.defectItems.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSeverityFilter('Critico')}
            className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
              activeSeverityFilter === 'Critico'
                ? 'bg-red-600 text-white border-red-700 shadow-xs'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
            }`}
          >
            <span>🚨 Críticos</span>
            <span className="font-mono text-[10px] font-black">
              ({report.defectItems.filter((i) => i.severity === 'Critico').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeverityFilter('Mayor')}
            className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
              activeSeverityFilter === 'Mayor'
                ? 'bg-amber-500 text-neutral-950 border-amber-600 shadow-xs font-black'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>⚠️ Mayores</span>
            <span className="font-mono text-[10px] font-black">
              ({report.defectItems.filter((i) => i.severity === 'Mayor').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeverityFilter('Menor')}
            className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
              activeSeverityFilter === 'Menor'
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span>ℹ️ Menores</span>
            <span className="font-mono text-[10px] font-black">
              ({report.defectItems.filter((i) => i.severity === 'Menor').length})
            </span>
          </button>
        </div>

        {/* Filtro de Categorías */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = activeCategoryFilter === cat;
            const countInCat = report.defectItems
              .filter((i) => cat === 'TODAS' || i.category === cat)
              .reduce((acc, curr) => acc + curr.defectsFound, 0);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-neutral-800 text-white border-neutral-800 shadow-xs'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <span>{cat}</span>
                {countInCat > 0 && (
                  <span className="bg-red-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {countInCat}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. LISTA DE CRITERIOS CON BOTONES TÁCTILES (+ / -) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const hasDefect = item.defectsFound > 0;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border-2 transition shadow-xs ${
                hasDefect
                  ? 'bg-red-50/90 border-red-400'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Encabezado del criterio */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono shrink-0 ${
                        item.severity === 'Critico'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : item.severity === 'Mayor'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      {item.severity === 'Critico' ? '🚨 Crítico' : item.severity === 'Mayor' ? '⚠️ Mayor' : 'Menor'}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase break-words">
                      {item.category}
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-neutral-900 mt-1 leading-snug break-words">
                    {item.name}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-normal break-words">
                    {item.description || 'Verificar que cumpla con los estándares de maquila.'}
                  </p>
                </div>
              </div>

              {/* Botones de conteo táctil (+ / -) */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-700">¿Piezas con falla?</span>
                </div>

                <div className="flex items-center space-x-2 bg-neutral-100 p-1 rounded-xl border border-neutral-300">
                  <button
                    type="button"
                    disabled={item.defectsFound === 0}
                    onClick={() => updateDefectItem(item.id, -1)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-black transition ${
                      item.defectsFound === 0
                        ? 'text-neutral-300 cursor-not-allowed bg-transparent'
                        : 'bg-white text-neutral-900 active:scale-90 shadow-xs'
                    }`}
                    title="Restar 1 defecto"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="w-10 text-center">
                    <span
                      className={`text-base font-black font-mono block ${
                        hasDefect ? 'text-red-700' : 'text-neutral-800'
                      }`}
                    >
                      {item.defectsFound}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateDefectItem(item.id, 1)}
                    className="w-10 h-10 bg-red-600 hover:bg-red-700 active:scale-90 text-white rounded-lg flex items-center justify-center font-black shadow-xs transition"
                    title="Sumar 1 pieza con defecto"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Si hay defecto, mostrar campo para detalle opcional */}
              {hasDefect && (
                <div className="mt-3 bg-white p-3 rounded-xl border border-red-200 space-y-1">
                  <label className="block text-[10px] font-bold text-red-900 uppercase">
                    Detalle del problema encontrado (Opcional):
                  </label>
                  <input
                    type="text"
                    defaultValue={item.description || ''}
                    onBlur={(e) => handleSetDescription(item.id, e.target.value)}
                    placeholder="Ej. 2 piezas con rebaba o caja rota"
                    className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg font-sans focus:outline-red-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. RESUMEN DE TOTALES Y BOTÓN PARA PASAR AL PASO 3 CON CANDADO POKA-YOKE */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-40 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center space-x-2">
          <button
            type="button"
            onClick={onPrevStep}
            className="w-12 py-3 sm:py-3.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-black rounded-xl border border-neutral-300 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Volver al Paso 1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isInspectionCompleted ? (
            <button
              type="button"
              onClick={onNextStep}
              className={`flex-1 py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md cursor-pointer ${
                isApproved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                  : isRejected
                  ? 'bg-red-600 hover:bg-red-700 text-white active:scale-98'
                  : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-98'
              }`}
            >
              <span>✓ Paso 3: Tomar las 4 Fotos de Evidencia</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 bg-neutral-200 text-neutral-500 border border-neutral-300 cursor-not-allowed shadow-none"
            >
              <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>🔒 Paso 3 Bloqueado: Registra la Muestra Inspeccionada</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
