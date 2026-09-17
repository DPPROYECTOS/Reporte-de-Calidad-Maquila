import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Cloud, 
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check
} from 'lucide-react';
import { InspectionLevel, AQLTarget } from '../types/qualityReport';
import { 
  AqlSamplingRuleRow, 
  fetchAqlRulesFromSupabase, 
  calculateAQLWithSupabaseRules,
  logAqlCalculationToSupabase,
  updateAqlRuleInSupabase,
  getLocalAqlRules
} from '../utils/aqlSupabase';

interface AqlCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan?: (plan: { codeLetter: string; sampleSize: number; ac: number; re: number; aql: AQLTarget }) => void;
  reportId?: string;
  skuArmado?: string;
}

export const AqlCalculatorModal: React.FC<AqlCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
  reportId,
  skuArmado,
}) => {
  const [testLotSize, setTestLotSize] = useState<number>(500);
  const [level, setLevel] = useState<InspectionLevel>('General II');
  const [aql, setAql] = useState<AQLTarget>(1.5);

  // Estados de Supabase
  const [cloudRules, setCloudRules] = useState<AqlSamplingRuleRow[]>(() => getLocalAqlRules());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [showFullTable, setShowFullTable] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<number | string | null>(null);
  const [editForm, setEditForm] = useState<{ ac: number; re: number; sampleSize: number }>({ ac: 0, re: 1, sampleSize: 50 });

  // Sincronizar reglas desde Supabase al abrir el modal
  useEffect(() => {
    if (!isOpen) return;
    setIsSyncing(true);
    fetchAqlRulesFromSupabase()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCloudRules(res.data);
          setIsCloudConnected(true);
        } else {
          setIsCloudConnected(res.fromCloud);
        }
      })
      .catch(() => {
        setIsCloudConnected(false);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Cálculo del resultado usando reglas sincronizadas de Supabase
  const result = calculateAQLWithSupabaseRules(testLotSize, level, aql, cloudRules);

  // Forzar sincronización manual
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetchAqlRulesFromSupabase();
      if (res.data && res.data.length > 0) {
        setCloudRules(res.data);
        setIsCloudConnected(true);
        setStatusNotification(`¡${res.data.length} reglas sincronizadas con Supabase!`);
      } else {
        setStatusNotification('Conectado a Supabase (usando matriz estándar ANSI/ASQ Z1.4)');
      }
    } catch (e: any) {
      setStatusNotification(`Error de conexión: ${e?.message || 'Revisa Supabase'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusNotification(null), 3500);
    }
  };

  // Guardar edición de regla en Supabase
  const handleSaveRuleEdit = async (rule: AqlSamplingRuleRow) => {
    const updatedRule: AqlSamplingRuleRow = {
      ...rule,
      sample_size: editForm.sampleSize,
      ac: editForm.ac,
      re: editForm.re,
    };

    setCloudRules((prev) => prev.map((r) => (r.id === rule.id ? updatedRule : r)));
    setEditingRuleId(null);

    const res = await updateAqlRuleInSupabase(updatedRule);
    if (res.success) {
      setStatusNotification('Regla AQL actualizada en Supabase');
    } else {
      setStatusNotification(`Advertencia: ${res.error || 'Guardado local'}`);
    }
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Aplicar muestreo al reporte y guardar log en Supabase
  const handleApply = () => {
    if (onApplyPlan) {
      onApplyPlan({
        codeLetter: result.codeLetter,
        sampleSize: result.sampleSize,
        ac: result.ac,
        re: result.re,
        aql: aql,
      });

      // Registrar auditoría en Supabase en segundo plano
      logAqlCalculationToSupabase({
        lot_size: testLotSize,
        inspection_level: level,
        aql_target: aql,
        code_letter: result.codeLetter,
        sample_size: result.sampleSize,
        ac: result.ac,
        re: result.re,
        report_id: reportId,
        sku_armado: skuArmado,
      });
    }
    onClose();
  };

  // Filtrar filas relevantes para la tabla de referencia según el nivel y AQL actual
  const referenceRanges = [
    { min: 151, max: 280, label: '151 - 280 pz' },
    { min: 281, max: 500, label: '281 - 500 pz' },
    { min: 501, max: 1200, label: '501 - 1,200 pz' },
    { min: 1201, max: 3200, label: '1,201 - 3,200 pz' },
    { min: 3201, max: 10000, label: '3,201 - 10,000 pz' },
  ];

  const extendedRanges = [
    { min: 2, max: 8, label: '2 - 8 pz' },
    { min: 9, max: 15, label: '9 - 15 pz' },
    { min: 16, max: 25, label: '16 - 25 pz' },
    { min: 26, max: 50, label: '26 - 50 pz' },
    { min: 51, max: 90, label: '51 - 90 pz' },
    { min: 91, max: 150, label: '91 - 150 pz' },
    ...referenceRanges,
    { min: 10001, max: 35000, label: '10,001 - 35,000 pz' },
    { min: 35001, max: 150000, label: '35,001 - 150,000 pz' },
  ];

  const displayedRanges = showFullTable ? extendedRanges : referenceRanges;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden no-print">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-300 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Header - Fixed */}
        <div className="flex-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-md shadow-amber-500/20 shrink-0 ring-1 ring-amber-300/40">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide break-words">
                  Tabla de Muestreo AQL
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0">
                  CALCULADORA
                </span>
                
                {/* Conexión Supabase */}
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50"
                  title="Reglas sincronizadas con Supabase en tiempo real"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Supabase Conectado'}</span>
                </button>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 flex-wrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">Anexo 8 CVD-AMA-PR-01</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Norma Militar ANSI / ASQ Z1.4</span>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 sm:space-y-5 text-xs text-[#1A1A1A] bg-[#FAF9F6]">
          {/* Info Banner */}
          <div className="bg-white border border-neutral-300 rounded-xl p-3 text-[11px] sm:text-xs text-neutral-800 flex items-start space-x-2 shadow-xs">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Normativa de Calidad:</strong> Las órdenes de maquila se inspeccionan con <strong>Nivel General II</strong> y <strong>AQL 1.5% Normal</strong> (Procedimiento <code>CVD-AMA-PR-01</code>).
            </div>
          </div>

          {/* Interactive Calculator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-300 shadow-xs">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
                Lote Total (N):
              </label>
              <input
                type="number"
                min={2}
                value={testLotSize}
                onChange={(e) => setTestLotSize(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full bg-[#FAF9F6] border-2 border-neutral-300 rounded-lg px-3 py-2 font-mono text-sm font-black text-neutral-900 focus:bg-white focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
                Nivel Inspección:
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as InspectionLevel)}
                className="w-full bg-[#FAF9F6] border-2 border-neutral-300 rounded-lg px-2.5 py-2 text-xs text-neutral-900 font-bold focus:bg-white focus:border-neutral-900 focus:outline-none"
              >
                <option value="General II">General II (Estándar Maquila)</option>
                <option value="General I">General I (Reducida)</option>
                <option value="General III">General III (Estricta)</option>
                <option value="Especial S-3">Especial S-3 (Ensayos)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
                Nivel AQL Target:
              </label>
              <select
                value={aql}
                onChange={(e) => setAql(parseFloat(e.target.value) as AQLTarget)}
                className="w-full bg-[#FAF9F6] border-2 border-neutral-300 rounded-lg px-2.5 py-2 text-xs text-neutral-900 font-bold focus:bg-white focus:border-neutral-900 focus:outline-none"
              >
                <option value={1.5}>AQL 1.5% (Estándar Mayores)</option>
                <option value={0.65}>AQL 0.65% (Críticos Seguridad)</option>
                <option value={2.5}>AQL 2.5% (Aceptabilidad Tolerante)</option>
                <option value={4.0}>AQL 4.0% (Defectos Menores)</option>
              </select>
            </div>
          </div>

          {/* Results Cards Grid - 2x2 on mobile, 4 cols on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white border-2 border-neutral-300 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
              <span className="text-[9px] text-neutral-500 uppercase font-black tracking-wider block">Letra Código</span>
              <div className="text-xl sm:text-2xl font-black text-neutral-900 font-mono mt-0.5">{result.codeLetter}</div>
            </div>

            <div className="bg-white border-2 border-neutral-300 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
              <span className="text-[9px] text-neutral-500 uppercase font-black tracking-wider block">Muestra (n)</span>
              <div className="text-xl sm:text-2xl font-black text-neutral-900 font-mono mt-0.5">{result.sampleSize} pz</div>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] uppercase font-black tracking-wider">Acepta (Ac)</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-0.5">≤ {result.ac}</div>
              <span className="text-[9px] text-emerald-800 font-bold block">Max permitido</span>
            </div>

            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-red-900">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] uppercase font-black tracking-wider">Rechaza (Re)</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-950 font-mono mt-0.5">≥ {result.re}</div>
              <span className="text-[9px] text-red-800 font-bold block">Rechaza lote</span>
            </div>
          </div>

          {/* Reference Table Summary - Mobile responsive with scroll container */}
          <div className="border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="bg-[#1A1A1A] text-white px-3 py-2 text-xs font-serif font-bold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TableIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Tabla de Referencia AQL {aql}% ({level})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFullTable(!showFullTable)}
                  className="text-[10px] text-amber-300 hover:text-white font-sans font-bold flex items-center space-x-1 transition"
                >
                  <span>{showFullTable ? 'Mostrar rangos estándar' : 'Ver todos los rangos ANSI'}</span>
                  {showFullTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <span className="text-[9px] font-sans text-neutral-400 hidden sm:inline border-l border-neutral-700 pl-2">
                  ANSI/ASQ Z1.4
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[340px]">
                <thead className="bg-[#FAF9F6] text-neutral-800 uppercase text-[9px] font-bold border-b border-neutral-200 tracking-wider">
                  <tr>
                    <th className="px-2.5 sm:px-3 py-2">Rango Lote (N)</th>
                    <th className="px-2 sm:px-3 py-2 text-center">Letra</th>
                    <th className="px-2 sm:px-3 py-2 text-center">Muestra (n)</th>
                    <th className="px-2 sm:px-3 py-2 text-center">Acepta (Ac)</th>
                    <th className="px-2 sm:px-3 py-2 text-center">Rechaza (Re)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                  {displayedRanges.map((rng) => {
                    const rowPlan = calculateAQLWithSupabaseRules((rng.min + rng.max) / 2, level, aql, cloudRules);
                    const isSelected = testLotSize >= rng.min && testLotSize <= rng.max;

                    return (
                      <tr 
                        key={`${rng.min}-${rng.max}`}
                        onClick={() => setTestLotSize(rng.min)}
                        className={`cursor-pointer transition hover:bg-amber-50/60 ${
                          isSelected ? 'bg-amber-100 font-black' : ''
                        }`}
                        title="Haz clic para probar este rango de lote"
                      >
                        <td className="px-2.5 sm:px-3 py-2 font-sans font-bold flex items-center space-x-1.5">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />}
                          <span>{rng.label}</span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center font-black">{rowPlan.codeLetter}</td>
                        <td className="px-2 sm:px-3 py-2 text-center">{rowPlan.sampleSize} pz</td>
                        <td className="px-2 sm:px-3 py-2 text-center text-emerald-800 font-black">≤ {rowPlan.ac}</td>
                        <td className="px-2 sm:px-3 py-2 text-center text-red-800 font-black">≥ {rowPlan.re}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Notificación flotante de sincronización */}
        {statusNotification && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950 text-white text-xs px-3.5 py-1.5 rounded-xl border border-amber-400 shadow-2xl flex items-center space-x-2 font-bold animate-in fade-in slide-in-from-bottom-2">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>{statusNotification}</span>
          </div>
        )}

        {/* Footer - Fixed */}
        <div className="flex-none bg-white border-t border-neutral-200 p-3 sm:px-6 sm:py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 rounded-xl transition text-center"
          >
            Cerrar
          </button>

          {onApplyPlan && (
            <button
              onClick={handleApply}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition text-center shadow-sm active:scale-98 flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              <span>Aplicar Muestreo al Reporte</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

