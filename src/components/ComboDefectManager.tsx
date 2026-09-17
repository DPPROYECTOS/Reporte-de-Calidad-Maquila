import React, { useState } from 'react';
import { QualityReport, DefectCheckItem, DefectSeverity, DefectCategory } from '../types/qualityReport';
import { 
  COMBO_DEFECT_PRESETS, 
  ComboDefectPreset, 
  suggestPresetForCombo 
} from '../utils/comboDefectPresets';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Info, 
  Layers, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Check
} from 'lucide-react';

interface ComboDefectManagerProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  isCompact?: boolean;
}

const CATEGORIES: DefectCategory[] = [
  'Armado y Componentes',
  'Empaque y Cajas',
  'Etiquetado y Códigos',
  'Apariencia Físico-Cosmética',
  'Estiba y Paletizado',
];

export const ComboDefectManager: React.FC<ComboDefectManagerProps> = ({
  report,
  onUpdateReport,
  isCompact = false,
}) => {
  const [activeSeverityTab, setActiveSeverityTab] = useState<'TODOS' | 'Critico' | 'Mayor' | 'Menor'>('TODOS');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);

  // New defect form state
  const [newName, setNewName] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<DefectSeverity>('Mayor');
  const [newCategory, setNewCategory] = useState<DefectCategory>('Armado y Componentes');
  const [newDescription, setNewDescription] = useState<string>('');

  // Count by severity
  const criticalItems = report.defectItems.filter((i) => i.severity === 'Critico');
  const majorItems = report.defectItems.filter((i) => i.severity === 'Mayor');
  const minorItems = report.defectItems.filter((i) => i.severity === 'Menor');

  // Filtered items to show
  const displayedItems = activeSeverityTab === 'TODOS'
    ? report.defectItems
    : report.defectItems.filter((i) => i.severity === activeSeverityTab);

  // Apply a preset to the current report
  const handleApplyPreset = (preset: ComboDefectPreset) => {
    const newItems: DefectCheckItem[] = preset.items.map((item) => ({
      ...item,
      defectsFound: 0,
      passed: true,
    }));

    onUpdateReport({
      ...report,
      defectItems: newItems,
      totalCritical: 0,
      totalMajor: 0,
      totalMinor: 0,
      totalDefectives: 0,
      defectRatePercentage: 0,
      updatedAt: new Date().toISOString(),
    });
    setShowPresetsMenu(false);
  };

  // Add a new custom defect for this combo
  const handleAddCustomDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: DefectCheckItem = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      severity: newSeverity,
      category: newCategory,
      description: newDescription.trim() || `Defecto específico configurado para el combo ${report.skuArmado || 'actual'}.`,
      defectsFound: 0,
      passed: true,
    };

    const updatedItems = [...report.defectItems, newItem];
    onUpdateReport({
      ...report,
      defectItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });

    // Reset form
    setNewName('');
    setNewDescription('');
    setShowAddForm(false);
  };

  // Remove a defect item from this combo
  const handleRemoveDefect = (id: string) => {
    const updatedItems = report.defectItems.filter((i) => i.id !== id);
    onUpdateReport({
      ...report,
      defectItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Change severity of an existing item
  const handleChangeSeverity = (id: string, severity: DefectSeverity) => {
    const updatedItems = report.defectItems.map((item) => {
      if (item.id === id) {
        return { ...item, severity };
      }
      return item;
    });

    onUpdateReport({
      ...report,
      defectItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  const suggestedPreset = suggestPresetForCombo(
    report.skuArmado || '',
    report.descripcionArmado || '',
    report.cliente || ''
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-neutral-300 shadow-xs overflow-hidden space-y-3">
      {/* 1. ENCABEZADO DE LA SECCIÓN DE DEFECTOS */}
      <div className="bg-neutral-900 text-white p-4 border-b border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Defectos a Considerar para este Combo / Producto
              </h3>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                Clasificación por severidad: <strong>Críticos</strong> (Ac=0), <strong>Mayores</strong> y <strong>Menores</strong> según el producto a maquilar.
              </p>
            </div>
          </div>

          {/* Menú de catálogo rápido según combo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
              <span>Plantillas por Producto ({suggestedPreset.icon})</span>
              {showPresetsMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white text-neutral-900 rounded-2xl shadow-2xl border-2 border-neutral-300 p-2 z-30 animate-in fade-in">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1">
                  Selecciona catálogo según tu combo:
                </div>
                {COMBO_DEFECT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 transition flex items-start space-x-2 border border-transparent hover:border-neutral-200"
                  >
                    <span className="text-xl">{preset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-neutral-900 flex items-center justify-between">
                        <span className="truncate">{preset.name}</span>
                        {preset.id === suggestedPreset.id && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-md ml-1">
                            Sugerido
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Indicadores de severidad con conteos */}
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div 
            onClick={() => setActiveSeverityTab('TODOS')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              activeSeverityTab === 'TODOS' 
                ? 'bg-white/20 border-white text-white font-black' 
                : 'bg-black/20 border-neutral-700 text-neutral-300 hover:bg-white/10'
            }`}
          >
            <div className="text-[9px] uppercase font-bold">Total</div>
            <div className="text-base font-black font-mono">{report.defectItems.length}</div>
          </div>

          <div 
            onClick={() => setActiveSeverityTab('Critico')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              activeSeverityTab === 'Critico' 
                ? 'bg-red-500 text-white border-red-400 font-black shadow-sm' 
                : 'bg-red-950/40 border-red-800/60 text-red-300 hover:bg-red-900/40'
            }`}
          >
            <div className="text-[9px] uppercase font-bold flex items-center justify-center space-x-1">
              <span>🚨 Críticos</span>
            </div>
            <div className="text-base font-black font-mono">{criticalItems.length}</div>
          </div>

          <div 
            onClick={() => setActiveSeverityTab('Mayor')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              activeSeverityTab === 'Mayor' 
                ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-sm' 
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <div className="text-[9px] uppercase font-bold flex items-center justify-center space-x-1">
              <span>⚠️ Mayores</span>
            </div>
            <div className="text-base font-black font-mono">{majorItems.length}</div>
          </div>

          <div 
            onClick={() => setActiveSeverityTab('Menor')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              activeSeverityTab === 'Menor' 
                ? 'bg-blue-600 text-white border-blue-400 font-black shadow-sm' 
                : 'bg-blue-950/40 border-blue-800/60 text-blue-300 hover:bg-blue-900/40'
            }`}
          >
            <div className="text-[9px] uppercase font-bold flex items-center justify-center space-x-1">
              <span>ℹ️ Menores</span>
            </div>
            <div className="text-base font-black font-mono">{minorItems.length}</div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCTO / COMBO VINCULADO & BOTÓN AGREGAR DEFECTO */}
      <div className="px-4 pt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs">
          <span className="text-neutral-500">Combo actual: </span>
          <strong className="text-neutral-900 font-mono font-bold">
            {report.skuArmado || 'Sin SKU definido'}
          </strong>
          {report.descripcionArmado && (
            <span className="text-neutral-600 text-[11px] block truncate max-w-sm">
              {report.descripcionArmado}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>+ Agregar Defecto a este Combo</span>
        </button>
      </div>

      {/* 3. FORMULARIO PARA AGREGAR DEFECTO PERSONALIZADO AL COMBO */}
      {showAddForm && (
        <form 
          onSubmit={handleAddCustomDefect}
          className="mx-4 p-4 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h4 className="text-xs font-black uppercase text-amber-950 flex items-center space-x-1.5">
              <span>Nuevo Defecto para el Combo {report.skuArmado}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-800 uppercase mb-1">
              Nombre del Defecto: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Falta recetario o manual impreso dentro de la caja"
              className="w-full text-xs font-bold p-2.5 bg-white border border-amber-300 rounded-xl focus:outline-neutral-900"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-800 uppercase mb-1">
                Nivel de Severidad: <span className="text-red-500">*</span>
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as DefectSeverity)}
                className="w-full text-xs font-bold p-2 bg-white border border-amber-300 rounded-xl focus:outline-neutral-900"
              >
                <option value="Critico">🚨 Crítico (Ac=0 - Rechazo Inmediato)</option>
                <option value="Mayor">⚠️ Mayor (Falla de Función / Pieza faltante)</option>
                <option value="Menor">ℹ️ Menor (Estético / Cosmético leve)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-800 uppercase mb-1">
                Categoría: <span className="text-red-500">*</span>
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as DefectCategory)}
                className="w-full text-xs font-bold p-2 bg-white border border-amber-300 rounded-xl focus:outline-neutral-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-800 uppercase mb-1">
              Criterio o Detalle de Inspección:
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Instrucción de qué revisar físicamente (ej. Verificar en 100% de cajas muestreadas)"
              className="w-full text-xs p-2 bg-white border border-amber-300 rounded-xl focus:outline-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>Guardar Defecto en este Combo</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. LISTA DE DEFECTOS ACTIVOS PARA EL COMBO */}
      <div className="px-4 pb-4 space-y-2">
        {displayedItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
            No hay defectos en esta categoría para este combo. Usa el botón superior para agregar uno nuevo o cargar una plantilla.
          </div>
        ) : (
          displayedItems.map((item) => {
            const isCrit = item.severity === 'Critico';
            const isMay = item.severity === 'Mayor';
            const isMen = item.severity === 'Menor';

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                  isCrit
                    ? 'bg-red-50/40 border-red-300'
                    : isMay
                    ? 'bg-amber-50/30 border-amber-300'
                    : 'bg-neutral-50/80 border-neutral-200'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* Badge de severidad con selector rápido */}
                    <div className="flex items-center space-x-1">
                      {isCrit && (
                        <span className="bg-red-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span>🚨 Crítico</span>
                        </span>
                      )}
                      {isMay && (
                        <span className="bg-amber-500 text-neutral-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span>⚠️ Mayor</span>
                        </span>
                      )}
                      {isMen && (
                        <span className="bg-blue-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span>ℹ️ Menor</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      {item.category}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-neutral-900 leading-snug">
                    {item.name}
                  </h5>

                  {item.description && (
                    <p className="text-[11px] text-neutral-600 leading-tight">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Acciones del defecto para este combo */}
                <div className="flex items-center space-x-1 shrink-0">
                  {/* Selector rápido para cambiar severidad si el usuario lo requiere */}
                  <select
                    value={item.severity}
                    onChange={(e) => handleChangeSeverity(item.id, e.target.value as DefectSeverity)}
                    className="text-[10px] font-bold p-1 bg-white border border-neutral-300 rounded-lg focus:outline-none"
                    title="Cambiar severidad de este defecto"
                  >
                    <option value="Critico">🚨 Crítico</option>
                    <option value="Mayor">⚠️ Mayor</option>
                    <option value="Menor">ℹ️ Menor</option>
                  </select>

                  {/* Botón para eliminar este defecto del combo */}
                  <button
                    type="button"
                    onClick={() => handleRemoveDefect(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar este defecto de la lista del combo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
