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
  CloudUpload,
  RefreshCw
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
  
  // Estado de arrastre (Drag & Drop)
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
    }
  }, [isOpen, report.skuArmado]);

  // Inicializar o cargar bloques para la clave seleccionada (desde Supabase o Local)
  useEffect(() => {
    if (!isOpen) return;

    // Si la clave seleccionada es la del reporte actual, cargamos los items del reporte
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

  // --- Operaciones de Bloques (Colocar / Arrastrar / Quitar) ---

  // Agregar un bloque al combo
  const handleAddBlockToCombo = (block: Omit<DefectCheckItem, 'defectsFound' | 'passed'>) => {
    // Verificar si ya existe por nombre o id
    if (comboBlocks.some((b) => b.name.toLowerCase() === block.name.toLowerCase())) {
      return; // Ya está agregado
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
  };

  // Quitar un bloque del combo
  const handleRemoveBlockFromCombo = (id: string) => {
    const updated = comboBlocks.filter((b) => b.id !== id);
    setComboBlocks(updated);
    saveStoredDefectsForCombo(selectedSku, updated);
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

  // Cargar una plantilla preset completa
  const handleLoadPreset = (preset: ComboDefectPreset) => {
    const newItems: DefectCheckItem[] = preset.items.map((item) => ({
      ...item,
      id: `${item.id}-${Date.now()}`,
      defectsFound: 0,
      passed: true,
    }));
    setComboBlocks(newItems);
    saveStoredDefectsForCombo(selectedSku, newItems);
  };

  // Limpiar todos los bloques del combo
  const handleClearAllBlocks = () => {
    setComboBlocks([]);
    saveStoredDefectsForCombo(selectedSku, []);
  };

  // Drag and Drop handlers
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

    // Buscar en master blocks
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
      setCloudStatusMessage(`Defecto "${res.item.name}" guardado en Supabase`);
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
      // También actualizar en los bloques del combo actual si ya estaba colocado
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
      setCloudStatusMessage(`Defecto "${updated.name}" actualizado en Supabase`);
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
      setCloudStatusMessage('¡Banco de defectos y matriz sincronizados con Supabase!');
    } catch (e: any) {
      setCloudStatusMessage(`Error: ${e?.message || String(e)}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudStatusMessage(null), 3500);
    }
  };

  // Guardar y aplicar al reporte actual de inspección
  const handleApplyToActiveReport = () => {
    // Si la clave seleccionada es diferente a la del reporte, actualizar también el SKU del reporte
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
    
    // Guardar también la matriz en Supabase para este SKU
    saveComboDefectsToSupabase(selectedSku, comboBlocks).catch((err) => {
      console.warn('Error guardando combo defect matrix en Supabase:', err);
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-3 md:p-4 overflow-hidden no-print">
      <div className="bg-slate-100 sm:rounded-2xl shadow-2xl border border-neutral-300 w-full h-full sm:h-[95vh] sm:max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 1. HEADER COMPACTO Y ELEGANTE */}
        <div className="flex-none bg-slate-950 text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 p-1.5 rounded-lg font-black shadow-sm shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide truncate">
                  Matriz de Defectos por Combo
                </h3>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                  POKA-YOKE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                Coloca o retira los bloques de inspección vigentes para este modelo
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Estado e indicador de sincronización con Supabase */}
            <button
              type="button"
              onClick={handleManualSyncCloud}
              disabled={isSyncingCloud}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 shadow-xs"
              title="Sincronizar defectos y matriz con Supabase en tiempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">{isSyncingCloud ? 'Sincronizando...' : 'Supabase Activo'}</span>
            </button>

            {/* Selector de modo de vista (Tarjetas / Lista) */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded flex items-center space-x-1 font-bold transition ${
                  viewMode === 'cards' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'hover:text-white'
                }`}
                title="Vista en Tarjetas / Cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2 py-1 rounded flex items-center space-x-1 font-bold transition ${
                  viewMode === 'compact' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'hover:text-white'
                }`}
                title="Vista Compacta en Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Lista</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-700 transition active:scale-95 shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 2. BARRA DE COMBO SELECCIONADO (SIN TEXTO ENCIMADO NI SOBREPUESTO) */}
        <div className="bg-white border-b border-neutral-300 px-3 py-2 sm:px-4 flex-none space-y-2 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Datos del combo activo */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="font-mono font-black text-xs sm:text-sm bg-slate-900 text-white px-2.5 py-1 rounded-md shrink-0 shadow-xs">
                {currentComboInfo.sku}
              </span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 truncate flex-1 min-w-0" title={currentComboInfo.desc}>
                {currentComboInfo.desc}
              </span>
              <button
                type="button"
                onClick={() => setShowComboSelector(!showComboSelector)}
                className="text-[11px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 px-2.5 py-1 rounded-md flex items-center space-x-1 shrink-0 transition active:scale-95 shadow-2xs"
              >
                <span>{showComboSelector ? 'Ocultar' : 'Cambiar Clave'}</span>
                {showComboSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Conteo de severidades en chips limpios */}
            <div className="flex items-center space-x-1.5 text-xs shrink-0 overflow-x-auto no-scrollbar py-0.5">
              <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md border border-red-200 text-[10px] sm:text-xs shrink-0 flex items-center space-x-1">
                <span>🚨</span>
                <span>{criticalCount} Críticos</span>
              </span>
              <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200 text-[10px] sm:text-xs shrink-0 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{majorCount} Mayores</span>
              </span>
              <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[10px] sm:text-xs shrink-0 flex items-center space-x-1">
                <span>ℹ️</span>
                <span>{minorCount} Menores</span>
              </span>
            </div>
          </div>

          {/* Desplegable de selección de combos del catálogo */}
          {showComboSelector && (
            <div className="pt-2 border-t border-neutral-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-neutral-700">Elige la clave de armado a configurar:</span>
                <div className="relative w-full max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={comboSearch}
                    onChange={(e) => setComboSearch(e.target.value)}
                    placeholder="Buscar clave SKU o modelo..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="flex space-x-2 overflow-x-auto pb-1.5 no-scrollbar max-h-28">
                {filteredCombos.map((combo) => {
                  const isSelected = combo.sku === selectedSku;
                  const isCurrentReportSku = combo.sku === report.skuArmado;

                  return (
                    <button
                      key={combo.sku}
                      type="button"
                      onClick={() => {
                        setSelectedSku(combo.sku);
                        setShowComboSelector(false);
                      }}
                      className={`py-1.5 px-2.5 rounded-xl border text-left shrink-0 transition flex flex-col justify-between max-w-[210px] ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-amber-400'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full space-x-1">
                        <span className="font-mono font-black text-xs">{combo.sku}</span>
                        {isCurrentReportSku && (
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-amber-400 text-neutral-950' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            En Lote
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] truncate max-w-[190px] mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {combo.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PESTAÑAS SEGMENTADAS PARA PANTALLAS PEQUEÑAS / MÓVILES */}
        <div className="lg:hidden flex border-b border-neutral-300 bg-white p-1.5 gap-1 flex-none">
          <button
            type="button"
            onClick={() => setActiveMobileTab('combo')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center space-x-1 transition ${
              activeMobileTab === 'combo'
                ? 'bg-neutral-900 text-white shadow-xs ring-1 ring-amber-400'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>En Combo ({comboBlocks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('banco')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center space-x-1 transition ${
              activeMobileTab === 'banco'
                ? 'bg-neutral-900 text-white shadow-xs ring-1 ring-amber-400'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Banco ({filteredMasterBlocks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('presets')}
            className={`py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 transition shrink-0 ${
              activeMobileTab === 'presets'
                ? 'bg-amber-400 text-neutral-950 font-black shadow-xs ring-1 ring-amber-500'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
            title="Ver plantillas prediseñadas"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plantillas</span>
          </button>
        </div>

        {/* 3. WORKSPACE PRINCIPAL CON APROVECHAMIENTO COMPLETO DE ESPACIO */}
        <div className="flex-1 min-h-0 p-2 sm:p-3 bg-neutral-100/70 overflow-hidden">
          
          {/* VISTA MÓVIL DE PLANTILLAS PREDISEÑADAS */}
          {activeMobileTab === 'presets' && (
            <div className="lg:hidden h-full flex flex-col bg-white rounded-2xl border border-neutral-300 p-3 shadow-xs min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 flex-none">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs sm:text-sm font-black uppercase text-neutral-900">
                    Plantillas Prediseñadas
                  </h4>
                </div>
                <span className="text-[11px] text-neutral-500 font-bold">
                  {COMBO_DEFECT_PRESETS.length} disponibles
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2 pr-1">
                {COMBO_DEFECT_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 rounded-xl border border-neutral-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 transition shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{preset.icon}</span>
                        <div>
                          <h5 className="font-black text-xs sm:text-sm text-neutral-900">
                            {preset.name}
                          </h5>
                          <p className="text-[11px] text-neutral-500 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full shrink-0">
                        {preset.items.length} criterios
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleLoadPreset(preset);
                        setActiveMobileTab('combo');
                      }}
                      className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg uppercase tracking-wide flex items-center justify-center space-x-1.5 active:scale-98 transition shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cargar esta Plantilla a {selectedSku}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUADRÍCULA DE COLUMNAS PRINCIPALES */}
          <div className={`${activeMobileTab === 'presets' ? 'hidden' : 'h-full'} min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3`}>
            
            {/* --- COLUMNA A: BANCO GENERAL DE DEFECTOS (5 de 12 cols en desktop) --- */}
            <div className={`${activeMobileTab === 'banco' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 bg-white rounded-2xl border border-neutral-300 p-2.5 sm:p-3 shadow-xs flex-col space-y-2 h-full min-h-0`}>
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 flex-none">
                <div className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-neutral-700" />
                  <h4 className="text-xs sm:text-sm font-black uppercase text-neutral-900">
                    Banco General ({filteredMasterBlocks.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewBlockForm(!showNewBlockForm)}
                  className="text-[10px] font-black uppercase text-neutral-900 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-md flex items-center space-x-1 transition active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Nuevo</span>
                </button>
              </div>

              {/* Formulario de Nuevo Bloque */}
              {showNewBlockForm && (
                <form onSubmit={handleCreateCustomBlock} className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 space-y-2 animate-in fade-in flex-none">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-amber-950">
                    <span>Crear Bloque de Defecto:</span>
                    <button type="button" onClick={() => setShowNewBlockForm(false)} className="text-amber-800 hover:text-amber-950 font-bold">
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    placeholder="Nombre del defecto (ej. Falta sello holograma)"
                    className="w-full text-xs p-1.5 bg-white border border-amber-300 rounded-lg focus:outline-neutral-900 font-bold"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newBlockSeverity}
                      onChange={(e) => setNewBlockSeverity(e.target.value as DefectSeverity)}
                      className="text-xs p-1.5 bg-white border border-amber-300 rounded-lg font-bold"
                    >
                      <option value="Critico">🚨 Crítico (Ac=0)</option>
                      <option value="Mayor">⚠️ Mayor</option>
                      <option value="Menor">ℹ️ Menor</option>
                    </select>
                    <select
                      value={newBlockCategory}
                      onChange={(e) => setNewBlockCategory(e.target.value as DefectCategory)}
                      className="text-xs p-1.5 bg-white border border-amber-300 rounded-lg font-bold"
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
                    placeholder="Criterio de inspección o instrucción"
                    className="w-full text-xs p-1.5 bg-white border border-amber-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase rounded-lg"
                  >
                    Guardar y Añadir Bloque
                  </button>
                </form>
              )}

              {/* Filtros rápidos de Severidad */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold flex-none">
                <button
                  type="button"
                  onClick={() => setSelectedSeverityFilter('TODOS')}
                  className={`py-1 px-1.5 rounded-md border text-center transition ${
                    selectedSeverityFilter === 'TODOS' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeverityFilter('Critico')}
                  className={`py-1 px-1.5 rounded-md border text-center transition ${
                    selectedSeverityFilter === 'Critico' ? 'bg-red-600 text-white border-red-700 shadow-2xs' : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  }`}
                >
                  🚨 Críticos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeverityFilter('Mayor')}
                  className={`py-1 px-1.5 rounded-md border text-center transition ${
                    selectedSeverityFilter === 'Mayor' ? 'bg-amber-500 text-neutral-950 font-black border-amber-600 shadow-2xs' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  ⚠️ Mayores
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeverityFilter('Menor')}
                  className={`py-1 px-1.5 rounded-md border text-center transition ${
                    selectedSeverityFilter === 'Menor' ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  ℹ️ Menores
                </button>
              </div>

              {/* Buscador de defectos generales */}
              <div className="relative flex-none">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={generalSearch}
                  onChange={(e) => setGeneralSearch(e.target.value)}
                  placeholder="Buscar en banco general..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900"
                />
              </div>

              {/* Lista de Bloques Generales Disponibles */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {filteredMasterBlocks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-neutral-400">
                    No se encontraron defectos con los filtros actuales.
                  </div>
                ) : (
                  filteredMasterBlocks.map((block) => {
                    const isAssigned = comboBlocks.some(
                      (b) => b.name.toLowerCase() === block.name.toLowerCase()
                    );
                    const isCrit = block.severity === 'Critico';
                    const isMay = block.severity === 'Mayor';

                    return (
                      <div
                        key={block.id}
                        draggable={!isAssigned}
                        onDragStart={(e) => handleDragStart(e, block.id)}
                        className={`p-2.5 rounded-xl border transition flex items-start justify-between gap-2 cursor-grab active:cursor-grabbing ${
                          isAssigned
                            ? 'bg-neutral-100/90 border-neutral-200 opacity-60'
                            : isCrit
                            ? 'bg-red-50/70 border-red-200 hover:border-red-400 shadow-2xs'
                            : isMay
                            ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 shadow-2xs'
                            : 'bg-blue-50/60 border-blue-200 hover:border-blue-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          <GripVertical className="w-4 h-4 text-neutral-400 mt-1 shrink-0 hidden sm:inline" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                isCrit ? 'bg-red-600 text-white' : isMay ? 'bg-amber-500 text-neutral-950' : 'bg-blue-600 text-white'
                              }`}>
                                {isCrit ? '🚨 Crítico (Ac=0)' : isMay ? '⚠️ Mayor' : 'ℹ️ Menor'}
                              </span>
                              <span className="text-[9px] font-bold text-neutral-600 bg-white px-1.5 py-0.2 rounded border border-neutral-200">
                                {block.category}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-neutral-900 leading-snug">
                              {block.name}
                            </div>
                            {block.description && (
                              <div className="text-[11px] text-neutral-600 leading-snug">
                                {block.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones del defecto en Banco General */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {/* Botón Editar defecto en Banco General / Supabase */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDefect(block);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition"
                            title="Editar nombre, severidad, categoría o criterio en Banco General / Supabase"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar defecto del Banco General */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteModal({ isOpen: true, defect: block });
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-100 rounded-lg transition"
                            title="Eliminar defecto del Banco General y Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón de Colocar o Indicador de Asignado */}
                          <button
                            type="button"
                            disabled={isAssigned}
                            onClick={() => handleAddBlockToCombo(block)}
                            className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center space-x-1 transition ${
                              isAssigned
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default font-bold'
                                : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-95 shadow-xs'
                            }`}
                            title={isAssigned ? 'Ya está incluido en este combo' : 'Colocar este bloque en el combo actual'}
                          >
                            {isAssigned ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                                <span>En Combo</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 text-amber-400 stroke-[3]" />
                                <span>+ Colocar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* --- COLUMNA B: BLOQUES A VIGILAR EN ESTE COMBO (7 de 12 cols en desktop) --- */}
            <div className={`${activeMobileTab === 'combo' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 bg-white rounded-2xl border border-neutral-300 p-2.5 sm:p-3 shadow-xs flex-col space-y-2 h-full min-h-0`}>
              
              {/* Header del Combo y Plantillas Rápidas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-neutral-200 pb-1.5 flex-none">
                <div className="flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-black uppercase text-neutral-900 truncate">
                    Defectos a Vigilar ({comboBlocks.length})
                  </h4>
                </div>

                {/* Botones de Plantillas Rápidas compactos */}
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] text-neutral-500 font-bold hidden md:inline shrink-0">Plantillas:</span>
                  {COMBO_DEFECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleLoadPreset(preset)}
                      className="text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-md border border-neutral-300 transition active:scale-95 shrink-0"
                      title={preset.name}
                    >
                      <span>{preset.icon} {preset.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros internos del combo */}
              <div className="flex items-center gap-1.5 flex-none">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={comboSearchQuery}
                    onChange={(e) => setComboSearchQuery(e.target.value)}
                    placeholder="Buscar en defectos vigentes..."
                    className="w-full text-xs pl-8 pr-3 py-1 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>

                <div className="flex items-center space-x-1 text-[10px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setComboSeverityFilter('TODOS')}
                    className={`px-2 py-1 rounded-md border transition ${
                      comboSeverityFilter === 'TODOS' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboSeverityFilter('Critico')}
                    className={`px-2 py-1 rounded-md border transition ${
                      comboSeverityFilter === 'Critico' ? 'bg-red-600 text-white border-red-700' : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    🚨 {criticalCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboSeverityFilter('Mayor')}
                    className={`px-2 py-1 rounded-md border transition ${
                      comboSeverityFilter === 'Mayor' ? 'bg-amber-500 text-neutral-950 font-black' : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    ⚠️ {majorCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboSeverityFilter('Menor')}
                    className={`px-2 py-1 rounded-md border transition ${
                      comboSeverityFilter === 'Menor' ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    ℹ️ {minorCount}
                  </button>
                </div>
              </div>

              {/* Zona de Drop & Arrastre interactivo con scroll libre */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOnCombo}
                className={`rounded-xl border-2 border-dashed p-2 transition flex-1 min-h-0 flex flex-col overflow-hidden ${
                  isDropTargetActive
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                    : comboBlocks.length === 0
                    ? 'border-neutral-300 bg-neutral-50/70 items-center justify-center text-center'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                {comboBlocks.length === 0 ? (
                  <div className="p-4 text-center space-y-2 max-w-sm m-auto">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto text-lg">
                      🎯
                    </div>
                    <div className="font-black text-xs sm:text-sm text-neutral-800 uppercase">
                      Sin defectos asignados a este combo
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Arrastra bloques desde el <strong>Banco General</strong>, o presiona una de las plantillas rápidas superiores.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveMobileTab('banco')}
                      className="lg:hidden px-3 py-1.5 bg-neutral-900 text-white text-xs font-black rounded-lg uppercase tracking-wider"
                    >
                      Abrir Banco General (+{filteredMasterBlocks.length})
                    </button>
                  </div>
                ) : filteredComboBlocks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 m-auto">
                    No hay defectos que coincidan con la búsqueda interna.
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                    {/* Disposición según viewMode (Tarjetas o Lista) */}
                    <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'space-y-1.5'}>
                      {filteredComboBlocks.map((item, index) => {
                        const isCrit = item.severity === 'Critico';
                        const isMay = item.severity === 'Mayor';

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border transition flex flex-col justify-between ${
                              isCrit
                                ? 'bg-red-50/50 border-red-200 hover:border-red-400'
                                : isMay
                                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                                : 'bg-neutral-50/90 border-neutral-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                  <span className="text-[10px] font-black font-mono text-neutral-400">
                                    #{index + 1}
                                  </span>

                                  {/* Selector de Severidad en línea para este combo */}
                                  <select
                                    value={item.severity}
                                    onChange={(e) => handleChangeBlockSeverity(item.id, e.target.value as DefectSeverity)}
                                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border focus:outline-none cursor-pointer ${
                                      isCrit 
                                        ? 'bg-red-600 text-white border-red-700' 
                                        : isMay 
                                        ? 'bg-amber-500 text-neutral-950 border-amber-600' 
                                        : 'bg-blue-600 text-white border-blue-700'
                                    }`}
                                    title="Cambiar severidad"
                                  >
                                    <option value="Critico" className="bg-white text-neutral-900">🚨 Crítico (Ac=0)</option>
                                    <option value="Mayor" className="bg-white text-neutral-900">⚠️ Mayor</option>
                                    <option value="Menor" className="bg-white text-neutral-900">ℹ️ Menor</option>
                                  </select>

                                  <span className="text-[9px] font-bold text-neutral-500 bg-white px-1.5 py-0.2 rounded border border-neutral-200">
                                    {item.category}
                                  </span>
                                </div>

                                {/* Botón Quitar Bloque de este Combo */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBlockFromCombo(item.id)}
                                  className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                                  title="Quitar este defecto del combo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <h5 className="font-bold text-xs text-neutral-900 leading-snug">
                                {item.name}
                              </h5>

                              {item.description && (
                                <p className="text-[11px] text-neutral-600 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Controles de Pie de la Columna del Combo (Sin textos encimados) */}
              <div className="flex items-center justify-between text-xs pt-1.5 pb-0.5 border-t border-neutral-200 flex-none px-1">
                <button
                  type="button"
                  onClick={handleClearAllBlocks}
                  disabled={comboBlocks.length === 0}
                  className="text-[11px] font-bold text-neutral-500 hover:text-red-600 disabled:opacity-40 transition"
                >
                  Vaciar todos los bloques
                </button>

                <div className="text-[11px] text-neutral-600 font-mono">
                  Total a evaluar: <strong className="text-neutral-900 font-black">{comboBlocks.length} puntos</strong>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 4. FOOTER INFERIOR LIMPIO Y BALANCEADO */}
        <div className="flex-none bg-white p-2.5 sm:p-3 border-t border-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
          <div className="text-xs text-neutral-700 flex items-center space-x-1.5 truncate">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 hidden sm:inline" />
            <span className="truncate">
              Configuración para <strong>{selectedSku}</strong>: {comboBlocks.length} defectos vigentes ({criticalCount} Críticos, {majorCount} Mayores, {minorCount} Menores).
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition active:scale-98"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleApplyToActiveReport}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 active:scale-95 text-slate-950 text-xs font-black rounded-lg uppercase tracking-wider shadow-md flex items-center justify-center space-x-1.5"
            >
              <BookmarkPlus className="w-4 h-4 text-slate-950" />
              <span>Guardar y Aplicar a este Lote</span>
            </button>
          </div>
        </div>

      </div>

      {/* NOTIFICACIÓN FLOTANTE DE ACCIONES EN SUPABASE */}
      {cloudStatusMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-950 text-white px-4 py-2 rounded-xl shadow-2xl border border-amber-400 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 text-xs font-bold">
          <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{cloudStatusMessage}</span>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE DEFECTO EN BANCO GENERAL */}
      {editingDefect && (
        <EditDefectModal
          defect={editingDefect}
          onClose={() => setEditingDefect(null)}
          onSave={handleSaveEditMasterDefect}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO DE DEFECTO */}
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
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        {/* Header del Modal */}
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

        {/* Formulario */}
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

          {/* Botones de acción */}
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
