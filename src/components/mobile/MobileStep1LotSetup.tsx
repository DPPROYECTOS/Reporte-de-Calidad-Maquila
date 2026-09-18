import React, { useState, useEffect } from 'react';
import { QualityReport } from '../../types/qualityReport';
import { calculateAQLPlan } from '../../utils/aqlTable';
import { getStoredInspectors, DEFAULT_INSPECTORS, syncInspectorsFromSupabase } from '../../utils/appConfigStore';
import { 
  Package, 
  Hash, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  User, 
  Plus,
  Minus, 
  ChevronDown, 
  ShieldCheck,
  Lock,
  Check,
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { ProductComboSearch } from '../ProductComboSearch';
import { ComboDefectManager } from '../ComboDefectManager';

// Helpers para formato de hora 12 horas (ej. 09:00 a. m. / 12:00 p. m.)
function formatTime12(time24?: string): string {
  if (!time24) return '--:--';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const m = mStr ? mStr.padStart(2, '0') : '00';
  const ampm = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const padH = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${padH}:${m} ${ampm}`;
}

function getCurrentTime24(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function addMinutesToTime(time24: string, minsToAdd: number): string {
  if (!time24) return getCurrentTime24();
  const [hStr, mStr] = time24.split(':');
  let totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minsToAdd;
  if (isNaN(totalMinutes)) return getCurrentTime24();
  totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);
  const newH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const newM = String(totalMinutes % 60).padStart(2, '0');
  return `${newH}:${newM}`;
}

function computeDuration(start?: string, end?: string): { minutes: number; text: string; isValid: boolean } {
  if (!start || !end) return { minutes: 0, text: '--', isValid: true };
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return { minutes: 0, text: '--', isValid: true };

  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) {
    return { minutes: diff, text: 'Hora de término anterior al inicio', isValid: false };
  }
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  let text = '';
  if (hours > 0 && mins > 0) {
    text = `${hours} h ${mins} min`;
  } else if (hours > 0) {
    text = `${hours} h (${hours * 60} min)`;
  } else {
    text = `${mins} min`;
  }
  return { minutes: diff, text, isValid: true };
}

interface MobileStep1LotSetupProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onNextStep: () => void;
  onOpenComboDefectsModal?: () => void;
}

export const COMMON_INSPECTORS = DEFAULT_INSPECTORS;

export const MobileStep1LotSetup: React.FC<MobileStep1LotSetupProps> = ({
  report,
  onUpdateReport,
  onNextStep,
  onOpenComboDefectsModal,
}) => {
  const [inspectorsList, setInspectorsList] = useState<string[]>(() => getStoredInspectors());

  useEffect(() => {
    // Sincronizar inspectores desde Supabase
    syncInspectorsFromSupabase().then((res) => {
      if (res.fromCloud && res.data.length > 0) {
        setInspectorsList(res.data);
      }
    });

    const handleUpdate = (e: CustomEvent<string[]>) => {
      if (e.detail && Array.isArray(e.detail)) {
        setInspectorsList(e.detail);
      } else {
        setInspectorsList(getStoredInspectors());
      }
    };
    window.addEventListener('quality-inspectors-updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('quality-inspectors-updated', handleUpdate as EventListener);
    };
  }, []);

  const [showCustomInspectorInput, setShowCustomInspectorInput] = useState<boolean>(() => {
    return Boolean(report.inspectorName && !inspectorsList.includes(report.inspectorName));
  });

  // Cálculo de duración y validación
  const durationInfo = computeDuration(report.startTime || '09:00', report.endTime || '12:00');

  const handleUpdateStartTime = (newStart: string) => {
    const currentEnd = report.endTime || '12:00';
    const dur = computeDuration(newStart, currentEnd);
    onUpdateReport({
      ...report,
      startTime: newStart,
      durationMinutes: dur.isValid && dur.minutes > 0 ? dur.minutes : (report.durationMinutes || 60),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateEndTime = (newEnd: string) => {
    const currentStart = report.startTime || '09:00';
    const dur = computeDuration(currentStart, newEnd);
    onUpdateReport({
      ...report,
      endTime: newEnd,
      durationMinutes: dur.isValid && dur.minutes > 0 ? dur.minutes : (report.durationMinutes || 60),
      updatedAt: new Date().toISOString(),
    });
  };

  // Update total lot size and auto-recalculate AQL sampling behind the scenes
  const handleLotSizeChange = (newSize: number) => {
    const validSize = Math.max(0, newSize);
    
    if (validSize === 0) {
      onUpdateReport({
        ...report,
        totalLotSize: 0,
        totalTarimas: 0,
        codeLetter: '',
        sampleSizeRequired: 0,
        sampleSizeInspected: 0,
        acLimit: 0,
        reLimit: 0,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const plan = calculateAQLPlan(validSize, report.inspectionLevel || 'General II', report.aqlTarget || 1.5);
    const estimatedTarimas = Math.max(1, Math.ceil(validSize / (report.piezasPorTarima || 100)));

    onUpdateReport({
      ...report,
      totalLotSize: validSize,
      totalTarimas: estimatedTarimas,
      codeLetter: plan.codeLetter,
      sampleSizeRequired: plan.sampleSize,
      sampleSizeInspected: 0, // Inicia en reset: la supervisora debe registrar la inspección física
      acLimit: plan.ac,
      reLimit: plan.re,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAdjustLot = (delta: number) => {
    const current = report.totalLotSize || 0;
    const next = Math.max(0, current + delta);
    handleLotSizeChange(next);
  };

  // 4 REQUISITOS POKA-YOKE OBLIGATORIOS PARA CALIDAD
  const hasInspector = Boolean(report.inspectorName && report.inspectorName.trim() !== '');
  const hasFolio = Boolean(report.folioOT && report.folioOT.trim() !== '');
  const hasSku = Boolean(report.skuArmado && report.skuArmado.trim() !== '');
  const hasLotSize = Boolean(report.totalLotSize && report.totalLotSize > 0);

  const completedCount = [hasInspector, hasFolio, hasSku, hasLotSize].filter(Boolean).length;
  const isFormReady = hasInspector && hasFolio && hasSku && hasLotSize;

  return (
    <div className="space-y-4 pb-32 sm:pb-28">
      {/* Banner de Bienvenida y Propósito Poka-Yoke */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border-2 border-amber-300 p-4 rounded-2xl shadow-xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Paso 1: Configurar Lote de Inspección</span>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
            {completedCount} / 4 completados
          </span>
        </div>
        <h2 className="text-base font-black text-neutral-900 leading-tight">
          Datos de la Orden y Producto Maquilado
        </h2>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Ingresa los 4 datos obligatorios de Calidad. El candado del Paso 2 se abrirá en verde cuando todos estén listos.
        </p>
      </div>

      {/* 1. Nombre del Inspector y Folio de OT */}
      <div className="bg-white p-4 rounded-2xl border-2 border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
              1. Inspector y Folio de Orden (OT)
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            hasInspector && hasFolio ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {hasInspector && hasFolio ? '✓ Completo' : 'Obligatorio'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Inspector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
              Supervisor / Inspector de Calidad: <span className="text-red-500">*</span>
            </label>
            
            <div className="relative">
              <select
                value={
                  inspectorsList.includes(report.inspectorName)
                    ? report.inspectorName
                    : report.inspectorName
                    ? '__OTRO__'
                    : ''
                }
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  if (selectedVal === '__OTRO__') {
                    setShowCustomInspectorInput(true);
                    if (inspectorsList.includes(report.inspectorName)) {
                      onUpdateReport({ ...report, inspectorName: '' });
                    }
                  } else {
                    setShowCustomInspectorInput(false);
                    onUpdateReport({ ...report, inspectorName: selectedVal });
                  }
                }}
                className={`w-full border-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-neutral-900 focus:bg-white focus:border-neutral-900 focus:outline-none transition appearance-none pr-10 cursor-pointer ${
                  hasInspector ? 'bg-emerald-50/50 border-emerald-300' : 'bg-neutral-50 border-neutral-300'
                }`}
              >
                <option value="" disabled>
                  -- Selecciona tu Nombre de Inspector --
                </option>
                {inspectorsList.map((inspector) => (
                  <option key={inspector} value={inspector}>
                    👤 {inspector}
                  </option>
                ))}
                <option value="__OTRO__">
                  ✏️ + Escribir mi nombre manualmente...
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {(showCustomInspectorInput || (!inspectorsList.includes(report.inspectorName) && report.inspectorName !== '')) && (
              <div className="mt-2 animate-in fade-in">
                <input
                  type="text"
                  value={report.inspectorName}
                  onChange={(e) => onUpdateReport({ ...report, inspectorName: e.target.value })}
                  placeholder="Escribe tu nombre completo..."
                  className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-neutral-900 placeholder:text-neutral-400"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Folio OT */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
              Folio de Orden de Trabajo (OT): <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={report.folioOT}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  onUpdateReport({ 
                    ...report, 
                    folioOT: val,
                    folioMaquila: val.replace(/[^0-9]/g, '') || val 
                  });
                }}
                placeholder="Ingresa el Folio (ej. OT-2420)"
                className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-neutral-900 focus:bg-white focus:border-neutral-900 focus:outline-none uppercase transition ${
                  hasFolio ? 'bg-emerald-50/50 border-emerald-300' : 'bg-neutral-50 border-neutral-300'
                }`}
              />
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">
              Escribe el número de folio tal como viene en la orden física.
            </span>
          </div>

          {/* Horario de Inspección (Hora Inicio y Hora Término - Formato Oficial de Hoja) */}
          <div className="pt-3 border-t border-neutral-200 space-y-3">
            {/* Encabezado del Horario con Selector de Fecha */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-800 tracking-wide uppercase">
                    Horario de Inspección Oficial
                  </label>
                  <span className="text-[10px] text-neutral-500 block">
                    Control de tiempos de inicio y fin de la inspección
                  </span>
                </div>
              </div>

              {/* Selector de Fecha Estilizado */}
              <div className="inline-flex items-center space-x-1.5 bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs self-start sm:self-auto shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="text-[10px] font-bold text-neutral-600 uppercase">Fecha:</span>
                <input
                  type="date"
                  value={report.inspectionDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => onUpdateReport({ ...report, inspectionDate: e.target.value })}
                  className="bg-transparent font-mono font-bold text-neutral-800 text-xs focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Tarjetas de Horas (Grid Responsivo Sin Superposiciones) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* TARJETA 1: HORA INICIO */}
              <div className="border-2 border-neutral-200 rounded-xl p-3 bg-white hover:border-blue-200 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="font-bold text-xs text-neutral-800 uppercase tracking-wider">
                      Hora Inicio
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateStartTime(getCurrentTime24())}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-95 px-2 py-1 rounded-md border border-neutral-300 shadow-2xs transition cursor-pointer"
                    title="Asignar hora actual como hora de inicio"
                  >
                    <span>⏱️ Hora Actual</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <input
                    type="time"
                    value={report.startTime || '09:00'}
                    onChange={(e) => handleUpdateStartTime(e.target.value)}
                    className="w-full font-mono text-sm font-bold bg-neutral-50 hover:bg-white focus:bg-white border-2 border-neutral-200 focus:border-blue-500 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none transition shadow-2xs"
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 px-0.5">
                    <span>Formato 12 hrs:</span>
                    <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {formatTime12(report.startTime || '09:00')}
                    </span>
                  </div>
                </div>
              </div>

              {/* TARJETA 2: HORA TÉRMINO */}
              <div className="border-2 border-neutral-200 rounded-xl p-3 bg-white hover:border-blue-200 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    <span className="font-bold text-xs text-neutral-800 uppercase tracking-wider">
                      Hora Término
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateEndTime(
                          addMinutesToTime(report.startTime || getCurrentTime24(), 60)
                        )
                      }
                      className="text-[10px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-95 px-1.5 py-1 rounded border border-neutral-300 shadow-2xs transition"
                      title="Sumar 1 hora a la hora de inicio"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateEndTime(
                          addMinutesToTime(report.startTime || getCurrentTime24(), 120)
                        )
                      }
                      className="text-[10px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-95 px-1.5 py-1 rounded border border-neutral-300 shadow-2xs transition"
                      title="Sumar 2 horas a la hora de inicio"
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateEndTime(getCurrentTime24())}
                      className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 px-1.5 py-1 rounded border border-blue-200 shadow-2xs transition"
                      title="Asignar hora actual de término"
                    >
                      Ahora
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="time"
                    value={report.endTime || '12:00'}
                    onChange={(e) => handleUpdateEndTime(e.target.value)}
                    className="w-full font-mono text-sm font-bold bg-neutral-50 hover:bg-white focus:bg-white border-2 border-neutral-200 focus:border-blue-500 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none transition shadow-2xs"
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 px-0.5">
                    <span>Formato 12 hrs:</span>
                    <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {formatTime12(report.endTime || '12:00')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra Informativa de Duración Total Calculada */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 text-xs transition ${
                durationInfo.isValid && durationInfo.minutes > 0
                  ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                  : !durationInfo.isValid
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium">
                  {durationInfo.isValid ? (
                    <>
                      Duración calculada:{' '}
                      <strong className="font-black text-neutral-900">
                        {durationInfo.text}
                      </strong>
                      {durationInfo.minutes > 0 && (
                        <span className="text-neutral-500 ml-1">
                          ({durationInfo.minutes} min netos)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-bold text-amber-800">
                      ⚠️ Atención: La hora de término debe ser posterior a la de inicio
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 ml-auto">
                Sincronizado en Supabase
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clave / SKU del Producto o Combo Armado */}
      <div className="bg-white p-4 rounded-2xl border-2 border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
              2. Clave / SKU del Producto: <span className="text-red-500">*</span>
            </h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            hasSku 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
          }`}>
            {report.skuArmado || 'Sin ingresar'}
          </span>
        </div>

        <ProductComboSearch
          selectedSku={report.skuArmado}
          selectedDescription={report.descripcionArmado}
          componentes={report.componentesArmado}
          onSelectProduct={(sku, desc, componentes, claveCompuesta) => {
            onUpdateReport({
              ...report,
              skuArmado: sku,
              descripcionArmado: desc || report.descripcionArmado,
              componentesArmado: componentes || report.componentesArmado,
              claveCompuesta: claveCompuesta || report.claveCompuesta,
            });
          }}
          onUpdateDescription={(desc) => {
            onUpdateReport({
              ...report,
              descripcionArmado: desc,
            });
          }}
          onUpdateComponentes={(comps) => {
            onUpdateReport({
              ...report,
              componentesArmado: comps,
              claveCompuesta: comps.map((c) => c.sku).join('/'),
            });
          }}
          placeholder="Escribe la clave SKU o selecciona del catálogo..."
        />
      </div>

      {/* 3. Cantidad de Piezas (Tamaño del Lote N) */}
      <div className="bg-white p-4 rounded-2xl border-2 border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
              3. Cantidad Total de Piezas (Lote N): <span className="text-red-500">*</span>
            </h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            hasLotSize 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
          }`}>
            {hasLotSize ? `${report.totalLotSize} pzas` : '0 pzas'}
          </span>
        </div>

        <p className="text-xs text-neutral-600">
          Ingresa la cantidad exacta de piezas del lote físico para calcular la muestra AQL:
        </p>

        {/* Control numérico táctil */}
        <div className="bg-neutral-50 p-4 rounded-2xl border-2 border-neutral-300 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleAdjustLot(-50)}
            className="w-12 h-12 bg-white active:bg-neutral-200 border-2 border-neutral-300 rounded-xl flex items-center justify-center text-neutral-800 font-black shadow-xs"
            title="Restar 50"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center space-x-1">
              <input
                type="number"
                min={0}
                step={10}
                value={report.totalLotSize || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleLotSizeChange(isNaN(val) ? 0 : val);
                }}
                placeholder="0"
                className="w-32 text-center text-2xl font-black font-mono text-neutral-950 bg-white border-2 border-neutral-400 rounded-xl px-2 py-1 focus:border-neutral-950 focus:outline-none"
              />
              <span className="font-black text-sm text-neutral-600">PZAS</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
              Piezas Totales de la Orden
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAdjustLot(50)}
            className="w-12 h-12 bg-white active:bg-neutral-200 border-2 border-neutral-300 rounded-xl flex items-center justify-center text-neutral-800 font-black shadow-xs"
            title="Sumar 50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Botones de cantidades comunes */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[100, 300, 500, 1000].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => handleLotSizeChange(qty)}
              className={`py-2 text-xs font-mono font-bold rounded-xl border transition ${
                report.totalLotSize === qty
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              {qty} pz
            </button>
          ))}
        </div>

        {/* TARJETA POKA-YOKE: RESULTADO AQL EN TIEMPO REAL */}
        {hasLotSize ? (
          <div className="mt-4 bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center space-x-2 text-amber-900">
              <Info className="w-5 h-5 text-amber-700 shrink-0" />
              <h4 className="font-black text-xs uppercase tracking-wider">
                🎯 Tu Meta de Inspección Calculada (MIL-STD-105E):
              </h4>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 font-medium">Muestra que debes revisar al azar:</span>
                <span className="font-mono font-black text-base text-neutral-950 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                  {report.sampleSizeRequired} piezas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-emerald-50 border border-emerald-300 p-2 rounded-lg text-emerald-950">
                  <div className="font-bold uppercase text-[10px] text-emerald-800">✓ Se Aprueba si:</div>
                  <div className="font-black text-sm mt-0.5">
                    Hasta {report.acLimit} defectuosas
                  </div>
                </div>

                <div className="bg-red-50 border border-red-300 p-2 rounded-lg text-red-950">
                  <div className="font-bold uppercase text-[10px] text-red-800">✗ Se Rechaza si:</div>
                  <div className="font-black text-sm mt-0.5">
                    {report.reLimit} o más defectuosas
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 bg-neutral-50 border border-neutral-300 p-3 rounded-xl text-xs text-neutral-600 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ingresa una cantidad mayor a 0 para que el sistema calcule el muestreo AQL correspondiente.</span>
          </div>
        )}
      </div>

      {/* CANDADOS POKA-YOKE: LISTA DE VERIFICACIÓN DE LOS 4 REQUISITOS DE CALIDAD */}
      <div className="bg-white border-2 border-neutral-300 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-neutral-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Candados Poka-Yoke para Desbloquear el Paso 2</span>
          </div>
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
            isFormReady 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {isFormReady ? '✓ Todos Listos' : `${completedCount} / 4 Requisitos`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Requisito 1: Inspector */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            hasInspector ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="font-bold truncate">1. Inspector / Supervisor</span>
            <span className="font-black ml-2 shrink-0">{hasInspector ? '✓' : '❌ Falta'}</span>
          </div>

          {/* Requisito 2: Folio OT */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            hasFolio ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="font-bold truncate">2. Folio de Orden (OT)</span>
            <span className="font-black ml-2 shrink-0">{hasFolio ? '✓' : '❌ Falta'}</span>
          </div>

          {/* Requisito 3: Clave SKU */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            hasSku ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="font-bold truncate">3. Clave / SKU Producto</span>
            <span className="font-black ml-2 shrink-0">{hasSku ? '✓' : '❌ Falta'}</span>
          </div>

          {/* Requisito 4: Cantidad */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            hasLotSize ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="font-bold truncate">4. Cantidad de Piezas (&gt;0)</span>
            <span className="font-black ml-2 shrink-0">{hasLotSize ? '✓' : '❌ Falta'}</span>
          </div>
        </div>

        {!isFormReady && (
          <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            👉 <strong>Candado Poka-Yoke Activo:</strong> Completa los 4 campos obligatorios para que el botón inferior se active en <strong>verde</strong>.
          </p>
        )}
      </div>

      {/* BOTÓN FLOTANTE INFERIOR CON CANDADO POKA-YOKE */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-40 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
          {isFormReady ? (
            <button
              type="button"
              onClick={onNextStep}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span>✓ Paso 2: Comenzar Revisión de Piezas</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition bg-neutral-200 text-neutral-500 border border-neutral-300 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>🔒 Paso 2 Bloqueado: Completa los 4 Requisitos Arriba</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
