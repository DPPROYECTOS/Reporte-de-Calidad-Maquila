import React, { useState, useEffect } from 'react';
import { QualityReport, DefectCheckItem, DefectSeverity } from '../../types/qualityReport';
import { DEFAULT_CHECKLIST_ITEMS } from '../../utils/defaultChecklist';
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

  // Barrido automático: garantizar que solo existan estrictamente los 3 defectos del banco de defectos
  useEffect(() => {
    const validPoolIds = new Set(DEFAULT_CHECKLIST_ITEMS.map((b) => b.id));
    const currentItems = report.defectItems || [];
    const needsSweep =
      currentItems.length !== DEFAULT_CHECKLIST_ITEMS.length ||
      currentItems.some((it) => {
        const rawId = it.id?.replace(new RegExp(`-${report.skuArmado}$`), '');
        return !validPoolIds.has(it.id) && !validPoolIds.has(rawId);
      });

    if (needsSweep) {
      const sanitizedItems: DefectCheckItem[] = DEFAULT_CHECKLIST_ITEMS.map((masterItem) => {
        const existing = currentItems.find(
          (d) => d.id === masterItem.id || d.name.toLowerCase() === masterItem.name.toLowerCase()
        );
        return {
          ...masterItem,
          id: `${masterItem.id}-${report.skuArmado || 'COMBO'}`,
          defectsFound: existing ? existing.defectsFound : 0,
          passed: existing ? existing.passed : true,
        };
      });

      onUpdateReport({
        ...report,
        defectItems: sanitizedItems,
      });
    }
  }, [report.skuArmado, report.defectItems?.length]);

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

    // If sampleSizeInspected is 0, auto-set to required sample size since inspection is in progress
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

    const defectRate = currentInspected > 0 
      ? Number(((totalDefectives / currentInspected) * 100).toFixed(1))
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

  // Confirm inspection intelligently: keeps defects if found, marks sample as verified
  const handleConfirmInspection = () => {
    const requiredSize = report.sampleSizeRequired > 0 ? report.sampleSizeRequired : 50;

    let totalCritical = 0;
    let totalMajor = 0;
    let totalMinor = 0;
    let totalDefectives = 0;

    report.defectItems.forEach((item) => {
      if (item.defectsFound > 0) {
        totalDefectives += item.defectsFound;
        if (item.severity === 'Critico') totalCritical += item.defectsFound;
        if (item.severity === 'Mayor') totalMajor += item.defectsFound;
        if (item.severity === 'Menor') totalMinor += item.defectsFound;
      }
    });

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

    const defectRate = requiredSize > 0 
      ? Number(((totalDefectives / requiredSize) * 100).toFixed(1))
      : 0;

    onUpdateReport({
      ...report,
      sampleSizeInspected: requiredSize,
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

  // Reset all defects to zero only if supervisor explicitly requests a clean restart
  const handleResetAllToZero = () => {
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
      {/* 1. BARRA COMPACTA: SEMÁFORO Y MUESTREO AQL EN TIEMPO REAL */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all ${
          !isInspectionCompleted
            ? 'bg-neutral-900 text-white border-neutral-800'
            : isApproved
            ? 'bg-emerald-700 text-white border-emerald-800'
            : isRejected
            ? 'bg-red-700 text-white border-red-800'
            : 'bg-amber-600 text-neutral-950 border-amber-700'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center space-x-2.5">
            {!isInspectionCompleted ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : isApproved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            ) : isRejected ? (
              <XCircle className="w-5 h-5 text-red-200 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0" />
            )}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider opacity-85">
                Semáforo en Tiempo Real
              </div>
              <div className="text-sm sm:text-base font-black tracking-wide leading-tight">
                {!isInspectionCompleted
                  ? 'EN ESPERA DE REVISIÓN DE MUESTRA'
                  : isApproved
                  ? 'LOTE APROBADO (ETIQUETA VERDE)'
                  : isRejected
                  ? 'LOTE RECHAZADO (ETIQUETA ROJA)'
                  : 'CONDICIONADO (ETIQUETA AMARILLA)'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Botón Matriz de Defectos (Ventana) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenComboDefectsModal) {
                  onOpenComboDefectsModal();
                } else {
                  setShowComboDefectsManager(!showComboDefectsManager);
                }
              }}
              className="text-[11px] font-black text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-amber-700" />
              <span>Matriz Defectos</span>
            </button>
          </div>
        </div>

        {/* Resumen numérico rápido de muestreo */}
        <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-xs flex-wrap gap-y-1">
          <div className="flex items-center space-x-2">
            <span className="opacity-80 text-[11px]">Muestra requerida:</span>
            <span className="font-mono font-black text-white bg-white/20 px-1.5 py-0.5 rounded text-xs">
              {report.sampleSizeRequired} pz
            </span>
            <span className="opacity-70 text-[10px] hidden sm:inline">
              (Nivel {report.inspectionLevel} | Letra {report.codeLetter})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="opacity-80 text-[11px]">Defectos encontrados:</span>
            <span
              className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                report.totalDefectives > 0
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white/20 text-white'
              }`}
            >
              {report.totalDefectives} pz
            </span>
            <span className="opacity-70 text-[10px]">
              (Ac: {report.acLimit} | Re: {report.reLimit})
            </span>
          </div>
        </div>

        {isRejected && (
          <div className="mt-2 text-xs bg-red-900/60 border border-red-400/50 p-2 rounded-lg font-bold flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
            <span>Atención: El lote supera el límite AQL de rechazo. Se requerirá cuarentena.</span>
          </div>
        )}
      </div>

      {/* Panel Desplegable de Respaldo para Administrar Defectos */}
      {showComboDefectsManager && !onOpenComboDefectsModal && (
        <div className="animate-in fade-in">
          <ComboDefectManager report={report} onUpdateReport={onUpdateReport} />
        </div>
      )}

      {/* 2. ENCABEZADO DE DEFECTOS Y FILTROS (EN PRIMER PLANO) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-neutral-800 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-900">
              Criterios Físicos a Evaluar ({report.defectItems.length}):
            </span>
          </div>

          <span className="text-[11px] font-bold text-neutral-600">
            {report.totalDefectives === 0
              ? 'Todos conformes'
              : `${report.totalDefectives} ${report.totalDefectives === 1 ? 'falla detectada' : 'fallas detectadas'}`}
          </span>
        </div>

        {/* Solo mostrar filtros si hay más de 5 criterios para no saturar la pantalla a la supervisora */}
        {report.defectItems.length > 5 && (
          <div className="space-y-2">
            {/* Filtros de Severidad */}
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
        )}
      </div>

      {/* 3. LISTA DE CRITERIOS CON CHECKLIST INTERACTIVO (ENFOQUE B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const hasDefect = item.defectsFound > 0;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border-2 transition shadow-xs ${
                hasDefect
                  ? 'bg-red-50/90 border-red-400 ring-2 ring-red-300/40'
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
                    <span className="text-[10px] font-bold text-neutral-600 uppercase break-words">
                      {item.category}
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-neutral-900 mt-1 leading-snug break-words">
                    {item.name}
                  </h4>
                  <p className="text-xs text-neutral-700 mt-0.5 leading-normal break-words">
                    {item.description || 'Verificar que cumpla con los estándares de maquila.'}
                  </p>
                </div>
              </div>

              {/* Botones de acción táctiles e intuitivos (Poka-Yoke) */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                {!hasDefect ? (
                  <>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Sin Falla / Conforme</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateDefectItem(item.id, 1)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 hover:text-red-800 border border-red-300 font-black text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Reportar Defecto (+1)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-1.5 text-xs font-black text-red-800 bg-red-100/80 px-2.5 py-1.5 rounded-xl border border-red-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Falla Registrada:</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-red-300 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateDefectItem(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 active:scale-90 flex items-center justify-center font-black transition cursor-pointer"
                        title="Restar 1 pieza"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="px-2 text-center">
                        <span className="text-sm font-black font-mono text-red-700 block">
                          {item.defectsFound} <span className="text-[10px] font-sans text-neutral-500">pz</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateDefectItem(item.id, 1)}
                        className="w-8 h-8 bg-red-600 hover:bg-red-700 active:scale-90 text-white rounded-lg flex items-center justify-center font-black shadow-2xs transition cursor-pointer"
                        title="Sumar 1 pieza con falla"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
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
                    placeholder="Ej. Pieza rayada, empaque roto, etiqueta desalineada"
                    className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg font-sans focus:outline-red-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. CONFIRMACIÓN INTELIGENTE AL FINAL DE LA LISTA DE CRITERIOS (ENFOQUE A) */}
      <div
        className={`p-4 rounded-2xl border-2 transition shadow-xs ${
          report.totalDefectives > 0
            ? 'bg-amber-50/80 border-amber-400'
            : isInspectionCompleted
            ? 'bg-emerald-50/80 border-emerald-400'
            : 'bg-white border-neutral-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-neutral-900 flex items-center space-x-1.5">
              {report.totalDefectives > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Muestra con {report.totalDefectives}{' '}
                    {report.totalDefectives === 1 ? 'defecto detectado' : 'defectos detectados'}
                  </span>
                </>
              ) : isInspectionCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Muestra Completa Verificada: 0 Defectos</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Finalizar Revisión de Criterios Físicos</span>
                </>
              )}
            </h4>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              {report.totalDefectives > 0
                ? `Se registrarán ${report.sampleSizeRequired} piezas evaluadas conservando los defectos encontrados sin borrarlos.`
                : isInspectionCompleted
                ? `La muestra de ${report.sampleSizeRequired} piezas está registrada y lista para avanzar a las fotos.`
                : `Si revisaste los ${report.defectItems.length} criterios físicos y ninguno presentó falla, confirma aquí la muestra limpia.`}
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
            {report.totalDefectives > 0 ? (
              <button
                type="button"
                onClick={handleConfirmInspection}
                className="w-full sm:w-auto py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  Confirmar Muestra con {report.totalDefectives}{' '}
                  {report.totalDefectives === 1 ? 'Falla' : 'Fallas'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmInspection}
                className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>✓ Confirmar Muestra de {report.sampleSizeRequired} pzas (0 Defectos)</span>
              </button>
            )}
          </div>
        </div>

        {/* Opción de auxilio para resetear todo a 0 si la supervisora cometió un error */}
        {report.totalDefectives > 0 && (
          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex justify-end">
            <button
              type="button"
              onClick={handleResetAllToZero}
              className="text-[10px] font-bold text-neutral-600 hover:text-neutral-900 underline"
            >
              ¿Registraste una falla por error? Limpiar defectos y marcar todo conforme
            </button>
          </div>
        )}
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
