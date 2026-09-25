import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles, 
  Search, 
  GripVertical, 
  ArrowRight, 
  ArrowLeft,
  Info, 
  Check, 
  Package, 
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Pencil,
  Cloud,
  RefreshCw,
  ShieldCheck,
  Eye,
  Sliders
} from 'lucide-react';
import { 
  QualityReport, 
  DefectCheckItem, 
  DefectSeverity, 
  DefectCategory 
} from '../types/qualityReport';
import { PRODUCT_CATALOG, ProductComboItem } from '../data/productCatalog';
import { 
  MASTER_GENERAL_DEFECT_BLOCKS, 
  COMBO_DEFECT_PRESETS,
  ComboDefectPreset,
  suggestPresetForCombo,
  getStoredDefectsForCombo,
  saveStoredDefectsForCombo
} from '../utils/comboDefectPresets';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  MasterDefectItem,
  syncMasterDefectsFromSupabase,
  createMasterDefect,
  updateMasterDefect,
  deleteMasterDefect,
  loadComboDefectsFromSupabase,
  saveComboDefectsToSupabase,
  getLocalMasterDefects,
} from '../utils/defectMatrixSupabase';

interface ComboDefectMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
}

export const ComboDefectMatrixModal: React.FC<ComboDefectMatrixModalProps> = ({
  isOpen,
  onClose,
  report,
  onUpdateReport,
}) => {
  // Modo de visualización: 'guided' (Paso a Paso Poka-Yoke) o 'expert' (2 Columnas)
  const [workflowMode, setWorkflowMode] = useState<'guided' | 'expert'>('guided');
  
  // Paso activo en la Guía Poka-Yoke: 1 = Clave, 2 = Criterios, 3 = Confirmar y Guardar
  const [guidedStep, setGuidedStep] = useState<1 | 2 | 3>(1);
  const [guidedSubTab, setGuidedSubTab] = useState<'combo' | 'banco' | 'presets'>('combo');

  // Clave de armado seleccionada en la matriz
  const [selectedSku, setSelectedSku] = useState<string>(report.skuArmado || 'C0192-01');
  const [comboSearch, setComboSearch] = useState<string>('');
  const [showComboSelector, setShowComboSelector] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'combo' | 'banco' | 'presets'>('combo');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  
  // Bloques asignados al combo actualmente seleccionado
  const [comboBlocks, setComboBlocks] = useState<DefectCheckItem[]>([]);
  const [comboSearchQuery, setComboSearchQuery] = useState<string>('');
  const [comboSeverityFilter, setComboSeverityFilter] = useState<'TODOS' | DefectSeverity>('TODOS');
  
  // Filtros del Banco General de Defectos
  const [generalSearch, setGeneralSearch] = useState<string>('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<'TODOS' | DefectSeverity>('TODOS');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');
  
  // Estado de arrastre (Drag & Drop para modo experto)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isDropTargetActive, setIsDropTargetActive] = useState<boolean>(false);
  
  // Formulario de nuevo bloque de defecto
  const [showNewBlockForm, setShowNewBlockForm] = useState<boolean>(false);
  const [newBlockName, setNewBlockName] = useState<string>('');
  const [newBlockSeverity, setNewBlockSeverity] = useState<DefectSeverity>('Mayor');
  const [newBlockCategory, setNewBlockCategory] = useState<DefectCategory>('Armado y Componentes');
  const [newBlockDesc, setNewBlockDesc] = useState<string>('');
  const [masterBlocks, setMasterBlocks] = useState<MasterDefectItem[]>(() => getLocalMasterDefects());

  // Estados de Sincronización con Supabase y Edición / Eliminación
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudStatusMessage, setCloudStatusMessage] = useState<string | null>(null);
  const [editingDefect, setEditingDefect] = useState<MasterDefectItem | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    defect: MasterDefectItem | null;
  }>({ isOpen: false, defect: null });

  // Poka-Yoke: Modales de confirmación preventiva
  const [presetConfirmModal, setPresetConfirmModal] = useState<{
    isOpen: boolean;
    preset: ComboDefectPreset | null;
  }>({ isOpen: false, preset: null });

  const [clearConfirmModal, setClearConfirmModal] = useState<boolean>(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<boolean>(false);

  // Sincronizar banco general desde Supabase al abrir el modal
  useEffect(() => {
    if (!isOpen) return;
    setIsSyncingCloud(true);
    syncMasterDefectsFromSupabase()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setMasterBlocks(res.data);
        }
      })
      .finally(() => {
        setIsSyncingCloud(false);
      });
  }, [isOpen]);

  // Sincronizar SKU seleccionado cuando se abre la ventana
  useEffect(() => {
    if (isOpen && report.skuArmado) {
      setSelectedSku(report.skuArmado);
      // Iniciar en el Paso 2 si ya tiene defectos configurados para agilizar el trabajo de la supervisora
      if (report.defectItems && report.defectItems.length > 0) {
        setGuidedStep(2);
      } else {
        setGuidedStep(1);
      }
    }
  }, [isOpen, report.skuArmado]);

  // Inicializar o cargar bloques para la clave seleccionada (desde Supabase o Local)
  useEffect(() => {
    if (!isOpen) return;

    // Si la clave seleccionada es la del reporte actual y tiene defectos, los cargamos
    if (selectedSku === report.skuArmado && report.defectItems && report.defectItems.length > 0) {
      setComboBlocks(report.defectItems);
      return;
    }

    // Intentar cargar primero desde Supabase o localStorage
    loadComboDefectsFromSupabase(selectedSku).then((res) => {
      if (res.data && res.data.length > 0) {
        setComboBlocks(res.data);
        return;
      }

      // Si no, sugerir preset según la descripción de este SKU
      const catalogItem = PRODUCT_CATALOG.find((p) => p.sku === selectedSku);
      const desc = catalogItem ? catalogItem.desc : '';
      const suggested = suggestPresetForCombo(selectedSku, desc, report.cliente || '');
      const initialItems: DefectCheckItem[] = suggested.items.map((it) => ({
        ...it,
        defectsFound: 0,
        passed: true,
      }));
      setComboBlocks(initialItems);
    });
  }, [selectedSku, isOpen, report.skuArmado]);

  if (!isOpen) return null;

  // Catálogo de combos consolidado (catálogo oficial + sku personalizado del reporte si no está)
  const allCombos: ProductComboItem[] = [...PRODUCT_CATALOG];
  if (report.skuArmado && !allCombos.some((c) => c.sku === report.skuArmado)) {
    allCombos.unshift({
      sku: report.skuArmado,
      desc: report.descripcionArmado || 'Combo personalizado en inspección',
      category: 'Combo Personalizado',
    });
  }

  // Filtrado de combos por búsqueda
  const filteredCombos = allCombos.filter((c) => {
    if (!comboSearch.trim()) return true;
    const q = comboSearch.toLowerCase();
    return c.sku.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
  });

  // Combo actualmente seleccionado
  const currentComboInfo: ProductComboItem = allCombos.find((c) => c.sku === selectedSku) || {
    sku: selectedSku,
    desc: report.descripcionArmado || 'Combo de armado',
    category: 'General',
  };

  // Filtrado del Banco de Defectos Generales
  const filteredMasterBlocks = masterBlocks.filter((block) => {
    const matchSeverity = selectedSeverityFilter === 'TODOS' || block.severity === selectedSeverityFilter;
    const matchCategory = selectedCategoryFilter === 'TODAS' || block.category === selectedCategoryFilter;
    const matchSearch = !generalSearch.trim() || 
      block.name.toLowerCase().includes(generalSearch.toLowerCase()) || 
      block.description?.toLowerCase().includes(generalSearch.toLowerCase());
    return matchSeverity && matchCategory && matchSearch;
  });

  // Filtrado de Defectos en este Combo
  const filteredComboBlocks = comboBlocks.filter((block) => {
    const matchSeverity = comboSeverityFilter === 'TODOS' || block.severity === comboSeverityFilter;
    const matchSearch = !comboSearchQuery.trim() || 
      block.name.toLowerCase().includes(comboSearchQuery.toLowerCase()) || 
      block.description?.toLowerCase().includes(comboSearchQuery.toLowerCase());
    return matchSeverity && matchSearch;
  });

  // Conteo de defectos del combo
  const criticalCount = comboBlocks.filter((b) => b.severity === 'Critico').length;
  const majorCount = comboBlocks.filter((b) => b.severity === 'Mayor').length;
  const minorCount = comboBlocks.filter((b) => b.severity === 'Menor').length;

  // Sugerencia de plantilla automática para el SKU actual
  const suggestedPreset = suggestPresetForCombo(selectedSku, currentComboInfo.desc, report.cliente || '');

  // --- Operaciones de Bloques (Colocar / Arrastrar / Quitar) ---

  // Agregar un bloque al combo
  const handleAddBlockToCombo = (block: Omit<DefectCheckItem, 'defectsFound' | 'passed'>) => {
    if (comboBlocks.some((b) => b.name.toLowerCase() === block.name.toLowerCase())) {
      setCloudStatusMessage(`ℹ️ "${block.name}" ya se encuentra agregado al combo.`);
      setTimeout(() => setCloudStatusMessage(null), 2500);
      return;
    }

    const newItem: DefectCheckItem = {
      id: `${block.id}-${Date.now()}`,
      name: block.name,
      severity: block.severity,
      category: block.category,
      description: block.description,
      defectsFound: 0,
      passed: true,
    };

    const updated = [...comboBlocks, newItem];
    setComboBlocks(updated);
    saveStoredDefectsForCombo(selectedSku, updated);
    setCloudStatusMessage(`✅ Agregado: "${block.name}"`);
    setTimeout(() => setCloudStatusMessage(null), 2000);
  };

  // Quitar un bloque del combo
  const handleRemoveBlockFromCombo = (id: string) => {
    const target = comboBlocks.find((b) => b.id === id);
    const updated = comboBlocks.filter((b) => b.id !== id);
    setComboBlocks(updated);
    saveStoredDefectsForCombo(selectedSku, updated);
    if (target) {
      setCloudStatusMessage(`🗑️ Se quitó "${target.name}" del combo.`);
      setTimeout(() => setCloudStatusMessage(null), 2000);
    }
  };

  // Cambiar severidad de un bloque en este combo
  const handleChangeBlockSeverity = (id: string, severity: DefectSeverity) => {
    const updated = comboBlocks.map((b) => {
      if (b.id === id) return { ...b, severity };
      return b;
    });
    setComboBlocks(updated);
    saveStoredDefectsForCombo(selectedSku, updated);
  };

  // Solicitar confirmación para cargar preset si ya hay defectos
  const handleRequestLoadPreset = (preset: ComboDefectPreset) => {
    if (comboBlocks.length > 0) {
      setPresetConfirmModal({ isOpen: true, preset });
    } else {
      executeLoadPreset(preset);
    }
  };

  // Cargar una plantilla preset confirmada
  const executeLoadPreset = (preset: ComboDefectPreset) => {
    const newItems: DefectCheckItem[] = preset.items.map((item) => ({
      ...item,
      id: `${item.id}-${Date.now()}`,
      defectsFound: 0,
      passed: true,
    }));
    setComboBlocks(newItems);
    saveStoredDefectsForCombo(selectedSku, newItems);
    setPresetConfirmModal({ isOpen: false, preset: null });
    setGuidedSubTab('combo');
    setCloudStatusMessage(`✨ Plantilla "${preset.name}" cargada con éxito (${newItems.length} criterios).`);
    setTimeout(() => setCloudStatusMessage(null), 3000);
  };

  // Limpiar todos los bloques con confirmación preventiva
  const handleConfirmClearAll = () => {
    setComboBlocks([]);
    saveStoredDefectsForCombo(selectedSku, []);
    setClearConfirmModal(false);
    setCloudStatusMessage('🧹 Se vaciaron los criterios del combo.');
    setTimeout(() => setCloudStatusMessage(null), 2500);
  };

  // Drag and Drop handlers para modo experto
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData('text/plain', blockId);
    setDraggedBlockId(blockId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTargetActive(true);
  };

  const handleDragLeave = () => {
    setIsDropTargetActive(false);
  };

  const handleDropOnCombo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTargetActive(false);
    const blockId = e.dataTransfer.getData('text/plain') || draggedBlockId;
    if (!blockId) return;

    const foundBlock = masterBlocks.find((b) => b.id === blockId);
    if (foundBlock) {
      handleAddBlockToCombo(foundBlock);
    }
    setDraggedBlockId(null);
  };

  // Crear nuevo bloque general personalizado (local y Supabase)
  const handleCreateCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName.trim()) return;

    const res = await createMasterDefect({
      name: newBlockName.trim(),
      severity: newBlockSeverity,
      category: newBlockCategory,
      description: newBlockDesc.trim() || 'Criterio de inspección física específico para este producto.',
    });

    if (res.success) {
      setMasterBlocks((prev) => [res.item, ...prev.filter((b) => b.id !== res.item.id)]);
      handleAddBlockToCombo(res.item);
      setCloudStatusMessage(`☁️ Defecto "${res.item.name}" guardado en Supabase`);
      setTimeout(() => setCloudStatusMessage(null), 3000);
    }

    // Resetear formulario
    setNewBlockName('');
    setNewBlockDesc('');
    setShowNewBlockForm(false);
  };

  // Guardar edición de un defecto del banco general
  const handleSaveEditMasterDefect = async (updated: MasterDefectItem) => {
    const res = await updateMasterDefect(updated);
    if (res.success) {
      setMasterBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setComboBlocks((prev) =>
        prev.map((cb) => {
          if (cb.id.startsWith(updated.id) || cb.name.toLowerCase() === updated.name.toLowerCase()) {
            return {
              ...cb,
              name: updated.name,
              severity: updated.severity,
              category: updated.category,
              description: updated.description,
            };
          }
          return cb;
        })
      );
      setCloudStatusMessage(`☁️ Defecto "${updated.name}" actualizado en Supabase`);
      setTimeout(() => setCloudStatusMessage(null), 3000);
    }
    setEditingDefect(null);
  };

  // Confirmar eliminación de un defecto del banco general
  const handleConfirmDelete = async () => {
    if (!confirmDeleteModal.defect) return;
    const targetId = confirmDeleteModal.defect.id;
    const targetName = confirmDeleteModal.defect.name;
    setConfirmDeleteModal({ isOpen: false, defect: null });

    await deleteMasterDefect(targetId);
    setMasterBlocks((prev) => prev.filter((b) => b.id !== targetId));
    setCloudStatusMessage(`Defecto "${targetName}" eliminado de Supabase`);
    setTimeout(() => setCloudStatusMessage(null), 3000);
  };

  // Sincronización manual bajo demanda
  const handleManualSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const resMaster = await syncMasterDefectsFromSupabase();
      if (resMaster.data && resMaster.data.length > 0) {
        setMasterBlocks(resMaster.data);
      }
      const resCombo = await loadComboDefectsFromSupabase(selectedSku);
      if (resCombo.data && resCombo.data.length > 0) {
        setComboBlocks(resCombo.data);
      }
      setCloudStatusMessage('☁️ ¡Defectos y matriz sincronizados con Supabase!');
    } catch (e: any) {
      setCloudStatusMessage(`Error: ${e?.message || String(e)}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudStatusMessage(null), 3500);
    }
  };

  // Guardar y aplicar al reporte actual de inspección
  const handleApplyToActiveReport = () => {
    const isDifferentSku = selectedSku !== report.skuArmado;
    
    onUpdateReport({
      ...report,
      skuArmado: selectedSku,
      descripcionArmado: isDifferentSku ? currentComboInfo.desc : report.descripcionArmado,
      defectItems: comboBlocks,
      totalCritical: comboBlocks.filter((b) => b.severity === 'Critico' && b.defectsFound > 0).length,
      totalMajor: comboBlocks.filter((b) => b.severity === 'Mayor' && b.defectsFound > 0).length,
      totalMinor: comboBlocks.filter((b) => b.severity === 'Menor' && b.defectsFound > 0).length,
      updatedAt: new Date().toISOString(),
    });

    saveStoredDefectsForCombo(selectedSku, comboBlocks);
    
    saveComboDefectsToSupabase(selectedSku, comboBlocks).catch((err) => {
      console.warn('Error guardando combo defect matrix en Supabase:', err);
    });

    setSaveSuccessNotification(true);
    setTimeout(() => {
      setSaveSuccessNotification(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-2 md:p-4 overflow-hidden no-print">
      <div className="bg-slate-100 sm:rounded-2xl shadow-2xl border border-neutral-300 w-full h-full sm:h-[96vh] sm:max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ======================================================== */}
        {/* 1. ENCABEZADO SUPERIOR: CLARO, SEGURO Y ORIENTADOR       */}
        {/* ======================================================== */}
        <div className="flex-none bg-slate-950 text-white px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 p-2 rounded-xl font-black shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide truncate">
                  Configuración de Defectos por Combo
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 shadow-xs">
                  SISTEMA POKA-YOKE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block truncate mt-0.5">
                Guía visual para la supervisora: define qué defectos físicos se inspeccionarán en este modelo
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Selector de Modo: Guiado Poka-Yoke vs Modo Experto */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setWorkflowMode('guided')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition ${
                  workflowMode === 'guided'
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Modo Guiado paso a paso para supervisoras"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Paso a Paso</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkflowMode('expert')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition ${
                  workflowMode === 'expert'
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Vista completa de 2 columnas"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">2 Columnas</span>
              </button>
            </div>

            {/* Sincronización Supabase */}
            <button
              type="button"
              onClick={handleManualSyncCloud}
              disabled={isSyncingCloud}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
              title="Sincronizar defectos con la nube Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span className="hidden md:inline">{isSyncingCloud ? 'Sincronizando...' : 'Supabase'}</span>
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 sm:p-2 rounded-xl border border-slate-700 transition active:scale-95 shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. STEPPER VISUAL POKA-YOKE: GUÍA INEQUÍVOCA EN 3 PASOS  */}
        {/* ======================================================== */}
        {workflowMode === 'guided' && (
          <div className="bg-slate-900 px-3 sm:px-6 py-2.5 border-b border-slate-800 flex-none shadow-xs">
            <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
              
              {/* PASO 1 */}
              <button
                type="button"
                onClick={() => setGuidedStep(1)}
                className={`flex items-center p-2 rounded-xl border transition text-left ${
                  guidedStep === 1
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mr-2 ${
                  guidedStep === 1 ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-200'
                }`}>
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-black tracking-wider leading-none">
                    Paso 1
                  </div>
                  <div className="font-bold text-xs truncate mt-0.5">
                    Clave: {selectedSku}
                  </div>
                </div>
                {selectedSku && <Check className={`w-4 h-4 ml-1 shrink-0 ${guidedStep === 1 ? 'text-slate-950' : 'text-emerald-400'}`} />}
              </button>

              {/* PASO 2 */}
              <button
                type="button"
                onClick={() => setGuidedStep(2)}
                className={`flex items-center p-2 rounded-xl border transition text-left ${
                  guidedStep === 2
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mr-2 ${
                  guidedStep === 2 ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-200'
                }`}>
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-black tracking-wider leading-none">
                    Paso 2
                  </div>
                  <div className="font-bold text-xs truncate mt-0.5">
                    {comboBlocks.length} Defectos
                  </div>
                </div>
                {comboBlocks.length > 0 ? (
                  <span className={`w-2.5 h-2.5 rounded-full ml-1 shrink-0 ${criticalCount > 0 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping ml-1 shrink-0" />
                )}
              </button>

              {/* PASO 3 */}
              <button
                type="button"
                onClick={() => setGuidedStep(3)}
                className={`flex items-center p-2 rounded-xl border transition text-left ${
                  guidedStep === 3
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mr-2 ${
                  guidedStep === 3 ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-200'
                }`}>
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-black tracking-wider leading-none">
                    Paso 3
                  </div>
                  <div className="font-bold text-xs truncate mt-0.5">
                    Guardar y Aplicar
                  </div>
                </div>
                <BookmarkPlus className={`w-4 h-4 ml-1 shrink-0 ${guidedStep === 3 ? 'text-slate-950' : 'text-slate-400'}`} />
              </button>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. CONTENIDO PRINCIPAL SEGÚN EL MODO                     */}
        {/* ======================================================== */}
        <div className="flex-1 min-h-0 p-2 sm:p-4 bg-slate-100/90 overflow-hidden flex flex-col">
          
          {/* ------------------------------------------------------ */}
          {/* MODO A: ASISTENTE POKA-YOKE (GUIADO PASO A PASO)       */}
          {/* ------------------------------------------------------ */}
          {workflowMode === 'guided' && (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-neutral-300 shadow-sm overflow-hidden p-3 sm:p-5">
              
              {/* ==================================================== */}
              {/* PASO 1 GUIADO: SELECCIÓN Y CONFIRMACIÓN DEL MODELO    */}
              {/* ==================================================== */}
              {guidedStep === 1 && (
                <div className="flex-1 min-h-0 flex flex-col justify-between space-y-4 overflow-y-auto pr-1">
                  <div className="space-y-4">
                    {/* Tarjeta explicativa con instrucción visual clara */}
                    <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
                        📦
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-200 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            Paso 1 de 3
                          </span>
                          <span className="text-xs text-neutral-500 font-bold">
                            Selección de Modelo
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-neutral-900 mt-1">
                          ¿Qué modelo o clave de armado vas a inspeccionar?
                        </h4>
                        <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                          La matriz de defectos define qué debe revisar el inspector en la línea de producción para esta clave.
                        </p>
                      </div>
                    </div>

                    {/* Ficha Grande del Modelo Seleccionado */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 border-2 border-slate-800 shadow-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Clave de Armado Activa:
                          </span>
                          <span className="bg-amber-400 text-slate-950 font-mono font-black text-base sm:text-lg px-3 py-1 rounded-xl shadow-xs">
                            {currentComboInfo.sku}
                          </span>
                        </div>
                        {currentComboInfo.sku === report.skuArmado && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Asignado al Lote Actual</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-semibold">Descripción del Combo:</div>
                        <div className="text-base sm:text-xl font-black text-white mt-0.5 leading-snug">
                          {currentComboInfo.desc}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                          Categoría: <span className="text-amber-400 font-bold">{currentComboInfo.category || 'General'}</span>
                        </div>
                      </div>

                      {/* Botón para cambiar a otra clave si lo necesita */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowComboSelector(!showComboSelector)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-98"
                        >
                          <Search className="w-4 h-4 text-amber-400" />
                          <span>{showComboSelector ? 'Cerrar Lista de Modelos' : 'Cambiar a otra Clave o Modelo del Catálogo'}</span>
                          {showComboSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Desplegable de catálogo simplificado */}
                      {showComboSelector && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 animate-in fade-in">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={comboSearch}
                              onChange={(e) => setComboSearch(e.target.value)}
                              placeholder="Escribe para buscar clave SKU o descripción..."
                              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                            {filteredCombos.map((combo) => {
                              const isSelected = combo.sku === selectedSku;
                              return (
                                <button
                                  key={combo.sku}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSku(combo.sku);
                                    setShowComboSelector(false);
                                  }}
                                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-bold'
                                      : 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-black text-xs">{combo.sku}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                                  </div>
                                  <div className="text-[11px] truncate mt-1 opacity-90">
                                    {combo.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recomendación Poka-Yoke: Cargar plantilla sugerida en 1 toque */}
                    <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 text-emerald-900 font-black text-xs uppercase">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>Plantilla Sugerida de Fábrica para este Modelo:</span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          <strong>{suggestedPreset.name}</strong> ({suggestedPreset.items.length} criterios listos para cubiertos, sartenes y armado).
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequestLoadPreset(suggestedPreset)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Cargar Sugerencia en 1 Toque</span>
                      </button>
                    </div>
                  </div>

                  {/* Botón de Avance al Paso 2 */}
                  <div className="pt-3 border-t border-neutral-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setGuidedStep(2)}
                      className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 active:scale-95 text-slate-950 font-black text-sm rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
                    >
                      <span>Continuar al Paso 2: Revisar Defectos</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* PASO 2 GUIADO: REVISIÓN Y CONFIGURACIÓN DE DEFECTOS  */}
              {/* ==================================================== */}
              {guidedStep === 2 && (
                <div className="flex-1 min-h-0 flex flex-col space-y-3">
                  
                  {/* Semáforo Poka-Yoke de Calidad */}
                  {comboBlocks.length === 0 ? (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex items-center justify-between gap-2 animate-pulse flex-none">
                      <div className="flex items-center space-x-2 text-red-900">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <span className="text-xs font-black">
                          ¡Atención Poka-Yoke! No has asignado ningún defecto a este modelo.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRequestLoadPreset(suggestedPreset)}
                        className="px-3 py-1.5 bg-red-600 text-white font-black text-xs rounded-lg uppercase shadow-xs shrink-0 active:scale-95"
                      >
                        Cargar Sugerencia ({suggestedPreset.items.length})
                      </button>
                    </div>
                  ) : criticalCount === 0 ? (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between gap-2 flex-none">
                      <div className="flex items-center space-x-2 text-amber-950">
                        <Info className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold">
                          Aviso Poka-Yoke: No hay defectos Críticos (Ac=0). ¿Requiere algún criterio de rechazo inmediato?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuidedSubTab('banco')}
                        className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg uppercase shadow-2xs shrink-0 active:scale-95"
                      >
                        + Agregar Crítico
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-none">
                      <div className="flex items-center space-x-2 text-emerald-950 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          Matriz lista: {comboBlocks.length} defectos vigentes para {selectedSku}.
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold shrink-0">
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-md border border-red-200">
                          🚨 {criticalCount} Críticos
                        </span>
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                          ⚠️ {majorCount} Mayores
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                          ℹ️ {minorCount} Menores
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sub-Pestañas Claras y Táctiles */}
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1 flex-none gap-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => setGuidedSubTab('combo')}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                          guidedSubTab === 'combo'
                            ? 'bg-slate-900 text-white shadow-xs ring-2 ring-amber-400'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Defectos Asignados ({comboBlocks.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGuidedSubTab('banco')}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                          guidedSubTab === 'banco'
                            ? 'bg-slate-900 text-white shadow-xs ring-2 ring-amber-400'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                        <span>+ Banco General ({filteredMasterBlocks.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGuidedSubTab('presets')}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition ${
                          guidedSubTab === 'presets'
                            ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-500'
                            : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Plantillas</span>
                      </button>
                    </div>

                    {guidedSubTab === 'combo' && comboBlocks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setClearConfirmModal(true)}
                        className="text-[11px] font-bold text-neutral-500 hover:text-red-600 transition"
                      >
                        Vaciar combo
                      </button>
                    )}
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* SECCIÓN A: LISTA DE DEFECTOS DEL COMBO             */}
                  {/* -------------------------------------------------- */}
                  {guidedSubTab === 'combo' && (
                    <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                      {/* Buscador interno */}
                      <div className="flex items-center gap-2 flex-none">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            value={comboSearchQuery}
                            onChange={(e) => setComboSearchQuery(e.target.value)}
                            placeholder="Buscar en defectos asignados a este combo..."
                            className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-slate-900"
                          />
                        </div>

                        <div className="flex items-center space-x-1 text-[11px] font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => setComboSeverityFilter('TODOS')}
                            className={`px-2.5 py-1 rounded-lg border transition ${
                              comboSeverityFilter === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setComboSeverityFilter('Critico')}
                            className={`px-2.5 py-1 rounded-lg border transition ${
                              comboSeverityFilter === 'Critico' ? 'bg-red-600 text-white font-black' : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            🚨 {criticalCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => setComboSeverityFilter('Mayor')}
                            className={`px-2.5 py-1 rounded-lg border transition ${
                              comboSeverityFilter === 'Mayor' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            ⚠️ {majorCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => setComboSeverityFilter('Menor')}
                            className={`px-2.5 py-1 rounded-lg border transition ${
                              comboSeverityFilter === 'Menor' ? 'bg-blue-600 text-white font-black' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            ℹ️ {minorCount}
                          </button>
                        </div>
                      </div>

                      {/* Lista de tarjetas de defectos asignados */}
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                        {filteredComboBlocks.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                            <div className="text-3xl">🛡️</div>
                            <div className="font-black text-sm text-neutral-800 uppercase">
                              No hay defectos en esta vista
                            </div>
                            <p className="text-xs text-neutral-500 max-w-sm">
                              Puedes presionar el botón de abajo para explorar y agregar defectos del Banco General.
                            </p>
                            <button
                              type="button"
                              onClick={() => setGuidedSubTab('banco')}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl uppercase tracking-wider shadow-sm flex items-center space-x-1.5"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                              <span>Abrir Banco General de Defectos</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {filteredComboBlocks.map((item, idx) => {
                              const isCrit = item.severity === 'Critico';
                              const isMay = item.severity === 'Mayor';

                              return (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-2xl border-2 transition flex flex-col justify-between space-y-2 shadow-2xs ${
                                    isCrit
                                      ? 'bg-red-50/60 border-red-300 hover:border-red-400'
                                      : isMay
                                      ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                                      : 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 border-b border-black/5 pb-1.5 mb-1.5">
                                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                        <span className="font-mono font-black text-xs text-neutral-400 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                                          #{idx + 1}
                                        </span>

                                        {/* Botones de Severidad Semáforo Táctiles */}
                                        <div className="flex items-center bg-white rounded-lg p-0.5 border border-neutral-200 shadow-2xs">
                                          <button
                                            type="button"
                                            onClick={() => handleChangeBlockSeverity(item.id, 'Critico')}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase transition ${
                                              isCrit ? 'bg-red-600 text-white shadow-xs' : 'text-neutral-500 hover:text-red-600'
                                            }`}
                                            title="Marcar como Crítico (Ac = 0)"
                                          >
                                            Crítico
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleChangeBlockSeverity(item.id, 'Mayor')}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase transition ${
                                              isMay ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-neutral-500 hover:text-amber-600'
                                            }`}
                                            title="Marcar como Mayor"
                                          >
                                            Mayor
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleChangeBlockSeverity(item.id, 'Menor')}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase transition ${
                                              !isCrit && !isMay ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-500 hover:text-blue-600'
                                            }`}
                                            title="Marcar como Menor"
                                          >
                                            Menor
                                          </button>
                                        </div>

                                        <span className="text-[10px] font-bold text-neutral-600 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                                          {item.category}
                                        </span>
                                      </div>

                                      {/* Botón Quitar */}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBlockFromCombo(item.id)}
                                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition active:scale-95"
                                        title="Quitar este defecto del combo"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <h5 className="font-black text-xs sm:text-sm text-neutral-900 leading-snug">
                                      {item.name}
                                    </h5>

                                    {item.description && (
                                      <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------- */}
                  {/* SECCIÓN B: BANCO GENERAL (BUSCAR Y AGREGAR)        */}
                  {/* -------------------------------------------------- */}
                  {guidedSubTab === 'banco' && (
                    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
                      {/* Barra de Filtros del Banco General */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-none">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            value={generalSearch}
                            onChange={(e) => setGeneralSearch(e.target.value)}
                            placeholder="Escribe para buscar (ej. holograma, raspón, etiqueta)..."
                            className="w-full text-xs pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:bg-white focus:border-slate-900 font-medium"
                          />
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setShowNewBlockForm(!showNewBlockForm)}
                            className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition active:scale-95 shrink-0"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>+ Crear Nuevo Defecto</span>
                          </button>
                        </div>
                      </div>

                      {/* Formulario para Crear Nuevo Defecto */}
                      {showNewBlockForm && (
                        <form onSubmit={handleCreateCustomBlock} className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2.5 animate-in fade-in flex-none">
                          <div className="flex items-center justify-between text-xs font-black uppercase text-amber-950">
                            <span>Crear Nuevo Defecto en Banco General y Supabase:</span>
                            <button type="button" onClick={() => setShowNewBlockForm(false)} className="text-amber-800 hover:text-amber-950 font-black">
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={newBlockName}
                            onChange={(e) => setNewBlockName(e.target.value)}
                            placeholder="Nombre del defecto (ej. Falta código de barras o sello roto)"
                            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-xl font-bold focus:outline-slate-900"
                            required
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newBlockSeverity}
                              onChange={(e) => setNewBlockSeverity(e.target.value as DefectSeverity)}
                              className="text-xs p-2 bg-white border border-amber-300 rounded-xl font-bold"
                            >
                              <option value="Critico">🚨 Crítico (Ac = 0)</option>
                              <option value="Mayor">⚠️ Mayor</option>
                              <option value="Menor">ℹ️ Menor</option>
                            </select>
                            <select
                              value={newBlockCategory}
                              onChange={(e) => setNewBlockCategory(e.target.value as DefectCategory)}
                              className="text-xs p-2 bg-white border border-amber-300 rounded-xl font-bold"
                            >
                              <option value="Armado y Componentes">Armado y Componentes</option>
                              <option value="Empaque y Cajas">Empaque y Cajas</option>
                              <option value="Etiquetado y Códigos">Etiquetado y Códigos</option>
                              <option value="Apariencia Físico-Cosmética">Apariencia Físico-Cosmética</option>
                              <option value="Estiba y Paletizado">Estiba y Paletizado</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={newBlockDesc}
                            onChange={(e) => setNewBlockDesc(e.target.value)}
                            placeholder="Instrucción de inspección para el operador..."
                            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-xl"
                          />
                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase rounded-xl shadow-xs"
                          >
                            Guardar en Supabase y Colocar en Combo
                          </button>
                        </form>
                      )}

                      {/* Lista de Defectos del Banco General */}
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                        {filteredMasterBlocks.length === 0 ? (
                          <div className="text-center py-10 text-xs text-neutral-400">
                            No se encontraron defectos que coincidan con la búsqueda.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {filteredMasterBlocks.map((block) => {
                              const isAssigned = comboBlocks.some(
                                (b) => b.name.toLowerCase() === block.name.toLowerCase()
                              );
                              const isCrit = block.severity === 'Critico';
                              const isMay = block.severity === 'Mayor';

                              return (
                                <div
                                  key={block.id}
                                  className={`p-3 rounded-2xl border-2 transition flex items-start justify-between gap-2 ${
                                    isAssigned
                                      ? 'bg-neutral-100 border-neutral-200 opacity-60'
                                      : isCrit
                                      ? 'bg-red-50/70 border-red-200 hover:border-red-400 shadow-2xs'
                                      : isMay
                                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 shadow-2xs'
                                      : 'bg-blue-50/60 border-blue-200 hover:border-blue-300 shadow-2xs'
                                  }`}
                                >
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        isCrit ? 'bg-red-600 text-white' : isMay ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                                      }`}>
                                        {isCrit ? '🚨 Crítico (Ac=0)' : isMay ? '⚠️ Mayor' : 'ℹ️ Menor'}
                                      </span>
                                      <span className="text-[9px] font-bold text-neutral-600 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                                        {block.category}
                                      </span>
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug">
                                      {block.name}
                                    </div>
                                    {block.description && (
                                      <div className="text-[11px] text-neutral-600 leading-snug">
                                        {block.description}
                                      </div>
                                    )}
                                  </div>

                                  {/* Botón de Colocar o Ya asignado */}
                                  <div className="flex flex-col items-end space-y-1 shrink-0">
                                    <button
                                      type="button"
                                      disabled={isAssigned}
                                      onClick={() => handleAddBlockToCombo(block)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center space-x-1 transition ${
                                        isAssigned
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                          : 'bg-slate-950 hover:bg-slate-800 text-amber-400 shadow-md active:scale-95'
                                      }`}
                                    >
                                      {isAssigned ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                                          <span>Agregado</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                          <span>+ Colocar</span>
                                        </>
                                      )}
                                    </button>

                                    <div className="flex items-center space-x-1 text-neutral-400">
                                      <button
                                        type="button"
                                        onClick={() => setEditingDefect(block)}
                                        className="p-1 hover:text-amber-700 hover:bg-amber-100 rounded transition"
                                        title="Editar defecto en Supabase"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteModal({ isOpen: true, defect: block })}
                                        className="p-1 hover:text-red-700 hover:bg-red-100 rounded transition"
                                        title="Eliminar de Supabase"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------- */}
                  {/* SECCIÓN C: PLANTILLAS RÁPIDAS                     */}
                  {/* -------------------------------------------------- */}
                  {guidedSubTab === 'presets' && (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                      <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-950 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Las plantillas configuran automáticamente los defectos según la familia del producto (Sartenes, Cubiertos, Vajillas, etc.).
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMBO_DEFECT_PRESETS.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-4 rounded-2xl border-2 border-neutral-200 hover:border-amber-400 bg-white hover:bg-amber-50/30 transition shadow-2xs space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-2xl">{preset.icon}</span>
                                <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full">
                                  {preset.items.length} criterios
                                </span>
                              </div>
                              <h5 className="font-black text-sm text-neutral-900">
                                {preset.name}
                              </h5>
                              <p className="text-xs text-neutral-600 leading-relaxed">
                                {preset.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRequestLoadPreset(preset)}
                              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-98 text-white font-black text-xs rounded-xl uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md transition"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cargar esta Plantilla a {selectedSku}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botones Inferiores de Navegación del Paso 2 */}
                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between gap-2 flex-none">
                    <button
                      type="button"
                      onClick={() => setGuidedStep(1)}
                      className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver al Paso 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuidedStep(3)}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl uppercase tracking-wider shadow-md flex items-center space-x-2"
                    >
                      <span>Continuar al Paso 3: Guardar y Finalizar</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* PASO 3 GUIADO: RESUMEN Y GUARDADO SEGURO             */}
              {/* ==================================================== */}
              {guidedStep === 3 && (
                <div className="flex-1 min-h-0 flex flex-col justify-between space-y-4 overflow-y-auto pr-1">
                  <div className="space-y-4">
                    {/* Tarjeta de Confirmación Poka-Yoke */}
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
                        ✅
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            Paso 3 de 3 (Final)
                          </span>
                          <span className="text-xs text-neutral-500 font-bold">
                            Confirmación de Calidad
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-neutral-900 mt-1">
                          Revisión Final: Todo listo para aplicar al reporte
                        </h4>
                        <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                          Verifica el balance de severidades antes de guardar. Los cambios quedarán activos en este reporte de inspección y guardados en la nube Supabase.
                        </p>
                      </div>
                    </div>

                    {/* Resumen Métrico de Calidad */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 border-2 border-slate-800 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <div className="text-xs text-slate-400 font-bold">Modelo configurado:</div>
                          <div className="font-mono font-black text-lg sm:text-xl text-amber-400 mt-0.5">
                            {selectedSku}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-bold">Total a evaluar:</div>
                          <div className="font-black text-lg sm:text-xl text-white mt-0.5">
                            {comboBlocks.length} puntos
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="bg-red-950/70 border border-red-500/40 rounded-xl p-3 text-center">
                          <div className="text-xl sm:text-2xl font-black text-red-400">
                            {criticalCount}
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase text-red-200 mt-0.5">
                            Críticos (Ac=0)
                          </div>
                          <div className="text-[9px] text-red-300/80 mt-0.5 hidden sm:block">
                            Rechazo inmediato
                          </div>
                        </div>

                        <div className="bg-amber-950/70 border border-amber-500/40 rounded-xl p-3 text-center">
                          <div className="text-xl sm:text-2xl font-black text-amber-400">
                            {majorCount}
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase text-amber-200 mt-0.5">
                            Mayores
                          </div>
                          <div className="text-[9px] text-amber-300/80 mt-0.5 hidden sm:block">
                            Impacto funcional
                          </div>
                        </div>

                        <div className="bg-blue-950/70 border border-blue-500/40 rounded-xl p-3 text-center">
                          <div className="text-xl sm:text-2xl font-black text-blue-400">
                            {minorCount}
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase text-blue-200 mt-0.5">
                            Menores
                          </div>
                          <div className="text-[9px] text-blue-300/80 mt-0.5 hidden sm:block">
                            Detalles cosméticos
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                        <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Sincronización en la nube: Quedará disponible para cualquier inspector que abra la clave <strong>{selectedSku}</strong>.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Guardado */}
                  <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => setGuidedStep(2)}
                      className="px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver a Modificar Defectos</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyToActiveReport}
                      disabled={comboBlocks.length === 0}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:brightness-110 active:scale-95 text-white font-black text-sm rounded-xl uppercase tracking-wider shadow-xl flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <BookmarkPlus className="w-5 h-5 text-white stroke-[2.5]" />
                      <span>Guardar y Aplicar a este Lote de Inspección</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* MODO B: VISTA COMPLETA (2 COLUMNAS / EXPERTO)          */}
          {/* ------------------------------------------------------ */}
          {workflowMode === 'expert' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
              {/* Barra de combo rápido */}
              <div className="bg-white border border-neutral-300 rounded-xl px-3 py-2 flex items-center justify-between gap-2 flex-none shadow-2xs">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="font-mono font-black text-xs bg-slate-900 text-white px-2.5 py-1 rounded-md shrink-0">
                    {currentComboInfo.sku}
                  </span>
                  <span className="text-xs font-bold text-neutral-800 truncate" title={currentComboInfo.desc}>
                    {currentComboInfo.desc}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs shrink-0">
                  <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md border border-red-200 text-[11px]">
                    🚨 {criticalCount}
                  </span>
                  <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                    ⚠️ {majorCount}
                  </span>
                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                    ℹ️ {minorCount}
                  </span>
                </div>
              </div>

              {/* 2 Columnas: Banco General (5) y Defectos en Combo (7) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
                
                {/* Columna 1: Banco General */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-300 p-2.5 sm:p-3 shadow-xs flex flex-col space-y-2 h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 flex-none">
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-neutral-700" />
                      <h4 className="text-xs font-black uppercase text-neutral-900">
                        Banco General ({filteredMasterBlocks.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewBlockForm(!showNewBlockForm)}
                      className="text-[10px] font-black uppercase text-neutral-900 bg-amber-400 hover:bg-amber-300 px-2 py-1 rounded-md flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>+ Nuevo</span>
                    </button>
                  </div>

                  <div className="relative flex-none">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={generalSearch}
                      onChange={(e) => setGeneralSearch(e.target.value)}
                      placeholder="Buscar en banco general..."
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                    {filteredMasterBlocks.map((block) => {
                      const isAssigned = comboBlocks.some((b) => b.name.toLowerCase() === block.name.toLowerCase());
                      return (
                        <div
                          key={block.id}
                          draggable={!isAssigned}
                          onDragStart={(e) => handleDragStart(e, block.id)}
                          className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 ${
                            isAssigned ? 'bg-neutral-100 opacity-60' : 'bg-white hover:bg-amber-50/50 shadow-2xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-[9px] font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded">
                              {block.severity}
                            </span>
                            <div className="font-bold text-xs text-neutral-900 truncate">{block.name}</div>
                          </div>
                          <button
                            type="button"
                            disabled={isAssigned}
                            onClick={() => handleAddBlockToCombo(block)}
                            className="px-2 py-1 text-xs font-bold rounded-lg bg-neutral-900 text-white disabled:opacity-40"
                          >
                            {isAssigned ? '✓' : '+'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Columna 2: Defectos en este Combo */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-300 p-2.5 sm:p-3 shadow-xs flex flex-col space-y-2 h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 flex-none">
                    <div className="flex items-center space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-black uppercase text-neutral-900">
                        Defectos en este Combo ({comboBlocks.length})
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyToActiveReport}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase shadow-xs flex items-center space-x-1"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropOnCombo}
                    className={`flex-1 min-h-0 overflow-y-auto space-y-2 border-2 border-dashed rounded-xl p-2 ${
                      isDropTargetActive ? 'border-amber-400 bg-amber-50/50' : 'border-neutral-200'
                    }`}
                  >
                    {comboBlocks.map((item, idx) => (
                      <div key={item.id} className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold text-neutral-500">#{idx + 1} - {item.severity}</div>
                          <div className="font-bold text-xs text-neutral-900 truncate">{item.name}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockFromCombo(item.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* NOTIFICACIÓN FLOTANTE / TOAST                            */}
      {/* ======================================================== */}
      {cloudStatusMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-950 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 text-xs font-bold">
          <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{cloudStatusMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN AL CARGAR PRESET (POKA-YOKE)       */}
      {/* ======================================================== */}
      {presetConfirmModal.isOpen && presetConfirmModal.preset && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-black text-base text-neutral-900">
                  ¿Reemplazar por esta plantilla?
                </h4>
                <p className="text-xs text-neutral-500">
                  Plantilla: {presetConfirmModal.preset.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              Actualmente tienes <strong>{comboBlocks.length} defectos</strong> configurados. Al cargar la plantilla se reemplazarán por los <strong>{presetConfirmModal.preset.items.length} criterios</strong> de la nueva plantilla.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setPresetConfirmModal({ isOpen: false, preset: null })}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeLoadPreset(presetConfirmModal.preset!)}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-md"
              >
                Sí, Cargar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN PARA VACIAR COMBO (POKA-YOKE)      */}
      {/* ======================================================== */}
      {clearConfirmModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="font-black text-base text-neutral-900">
                  ¿Vaciar todos los defectos de este combo?
                </h4>
                <p className="text-xs text-neutral-500">
                  Clave: {selectedSku}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              Se quitarán los <strong>{comboBlocks.length} defectos</strong> asignados a este combo. (Los defectos seguirán existiendo en el Banco General de Supabase).
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setClearConfirmModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-md"
              >
                Sí, Vaciar Criterios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE EDICIÓN DE DEFECTO EN BANCO GENERAL / SUPABASE  */}
      {/* ======================================================== */}
      {editingDefect && (
        <EditDefectModal
          defect={editingDefect}
          onClose={() => setEditingDefect(null)}
          onSave={handleSaveEditMasterDefect}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN DE BORRADO DE DEFECTO SUPABASE     */}
      {/* ======================================================== */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, defect: null })}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar defecto del Banco General?"
        itemName={confirmDeleteModal.defect?.name}
        itemType="Defecto de Inspección"
        message="Se eliminará del Banco General y de la base de datos Supabase. Los reportes previos de inspección mantendrán su historial intacto."
        confirmText="Sí, eliminar defecto"
        cancelText="Cancelar"
        dangerBadge="SINCRONIZADO EN SUPABASE"
      />
    </div>
  );
};

interface EditDefectModalProps {
  defect: MasterDefectItem;
  onClose: () => void;
  onSave: (updated: MasterDefectItem) => void;
}

const EditDefectModal: React.FC<EditDefectModalProps> = ({ defect, onClose, onSave }) => {
  const [name, setName] = useState(defect.name);
  const [severity, setSeverity] = useState<DefectSeverity>(defect.severity);
  const [category, setCategory] = useState<DefectCategory>(defect.category);
  const [description, setDescription] = useState(defect.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...defect,
      name: name.trim(),
      severity,
      category,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-400 text-slate-950 rounded-lg">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Editar Defecto en Banco General</h4>
              <p className="text-[11px] text-slate-400">Los cambios se actualizarán también en Supabase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700">Nombre del Defecto *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900 font-bold"
              placeholder="Ej. Mango flojo o tornillo suelto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Nivel de Severidad *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg font-bold"
              >
                <option value="Critico">🚨 Crítico (Ac = 0)</option>
                <option value="Mayor">⚠️ Mayor</option>
                <option value="Menor">ℹ️ Menor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Categoría *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DefectCategory)}
                className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg font-bold"
              >
                <option value="Armado y Componentes">Armado y Componentes</option>
                <option value="Empaque y Cajas">Empaque y Cajas</option>
                <option value="Etiquetado y Códigos">Etiquetado y Códigos</option>
                <option value="Apariencia Físico-Cosmética">Apariencia Físico-Cosmética</option>
                <option value="Estiba y Paletizado">Estiba y Paletizado</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700">
              Criterio de Inspección / Instrucción Operativa
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900"
              placeholder="Describe detalladamente cómo debe evaluar el inspector este defecto..."
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase rounded-lg transition shadow-xs flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
