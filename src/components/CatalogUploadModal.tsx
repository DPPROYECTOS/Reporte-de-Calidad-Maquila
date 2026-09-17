import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  RotateCcw,
  Plus,
  RefreshCw,
  FileText,
  HelpCircle,
  Database,
  ArrowRight,
  Check,
  Info,
  Trash2,
  Cloud,
  CloudUpload,
  CloudCheck,
} from 'lucide-react';
import {
  ProductComboItem,
  ProductComponentItem,
  PRODUCT_CATALOG,
  saveCustomCatalog,
  resetCustomCatalog,
} from '../data/productCatalog';
import {
  parseCatalogFiles,
  generateCatalogTemplateFile,
  generateSingleSheetCsvTemplate,
  generateCatalogCsv,
  parsePastedCsvText,
  ParseCatalogResult,
} from '../utils/catalogParser';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  syncCatalogFromSupabase,
  uploadCatalogToSupabase,
  clearCatalogFromSupabase,
} from '../utils/productionCatalogSupabase';

interface CatalogUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogUpdated?: (newCatalog: ProductComboItem[]) => void;
}

export const CatalogUploadModal: React.FC<CatalogUploadModalProps> = ({
  isOpen,
  onClose,
  onCatalogUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste' | 'view'>('excel');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseCatalogResult | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState<number>(0);

  // Paste text state
  const [pasteMode, setPasteMode] = useState<'auto' | 'armados' | 'individuales'>('auto');
  const [pasteSingleText, setPasteSingleText] = useState<string>('');
  const [pasteIndividualesText, setPasteIndividualesText] = useState<string>('');
  const [pasteArmadosText, setPasteArmadosText] = useState<string>('');

  // Catalog inspection search
  const [inspectSearch, setInspectSearch] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('Catalogo_Produccion.xlsx');
  const [isUploadingCloud, setIsUploadingCloud] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'local' | 'syncing' | 'uploading'>('synced');
  const [cloudProgress, setCloudProgress] = useState<{ stage: string; current: number; total: number; percentage: number } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemType?: string;
    itemName?: string;
    message?: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '¿Confirmar acción?',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronización automática opcional desde Supabase al abrir si no hay datos locales
  useEffect(() => {
    if (isOpen && PRODUCT_CATALOG.length === 0) {
      setIsSyncingCloud(true);
      syncCatalogFromSupabase()
        .then((res) => {
          if (res.fromCloud && res.count > 0) {
            setSuccessMessage(`Se cargaron ${res.count} armados desde Supabase automáticamente.`);
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        })
        .finally(() => {
          setIsSyncingCloud(false);
        });
    }
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setParseResult(null);
      setCloudProgress(null);
    }
  }, [isOpen]);

  // Listener para sincronizar vista del catálogo
  useEffect(() => {
    const handleUpdate = () => {
      setCatalogVersion((v) => v + 1);
    };
    window.addEventListener('product-catalog-updated', handleUpdate);
    return () => window.removeEventListener('product-catalog-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSyncFromCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await syncCatalogFromSupabase();
      if (res.success && res.count > 0) {
        if (onCatalogUpdated) {
          onCatalogUpdated(PRODUCT_CATALOG);
        }
        setSuccessMessage(`¡Sincronización exitosa! ${res.count} armados descargados desde Supabase.`);
      } else {
        setSuccessMessage('No se encontraron registros en Supabase o ocurrió un error al consultar.');
      }
    } catch (e: any) {
      setSuccessMessage(`Error de sincronización: ${e?.message || String(e)}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleFilesProcess = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    if (files[0]) {
      setCurrentFileName(files.map((f) => f.name).join(', '));
    }
    try {
      const res = await parseCatalogFiles(files);
      setParseResult(res);
      // Auto expand the first 3 items in preview
      if (res.success && res.armados.length > 0) {
        const initialExpanded = new Set<string>();
        res.armados.slice(0, 4).forEach((a) => initialExpanded.add(a.sku));
        setExpandedSkus(initialExpanded);
      }
    } catch (err: any) {
      setParseResult({
        success: false,
        armados: [],
        stats: { totalArmados: 0, totalComponentes: 0, armadosConDescripcion: 0, sheetsFound: [] },
        warnings: [],
        errors: [`Error al procesar: ${err?.message || String(err)}`],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length > 0) {
      handleFilesProcess(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
    if (files.length > 0) {
      handleFilesProcess(files);
    }
  };

  const toggleExpandSku = (sku: string) => {
    setExpandedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  const handleApplyCatalog = async (replace: boolean) => {
    if (!parseResult || !parseResult.success || parseResult.armados.length === 0) return;

    // 1. Guardado inmediato en memoria y almacenamiento local (IndexedDB)
    await saveCustomCatalog(parseResult.armados, replace);
    if (onCatalogUpdated) {
      onCatalogUpdated(PRODUCT_CATALOG);
    }

    const actionText = replace ? 'guardado y reemplazado con éxito' : 'combinado y actualizado con éxito';
    setSuccessMessage(`¡Catálogo ${actionText}! ${PRODUCT_CATALOG.length} armados activos en el sistema.`);

    // 2. Sincronización asíncrona por lotes en Supabase
    setIsUploadingCloud(true);
    setCloudSyncStatus('uploading');
    try {
      const uploadRes = await uploadCatalogToSupabase(parseResult.armados, {
        fileName: currentFileName,
        mode: replace ? 'replace' : 'append',
        sourceType: activeTab === 'paste' ? 'pasted_text' : 'excel',
        onProgress: (p) => setCloudProgress(p),
      });

      if (uploadRes.success) {
        setCloudSyncStatus('synced');
        setSuccessMessage(`¡Catálogo sincronizado exitosamente en Supabase! (${uploadRes.count} armados).`);
      } else {
        setCloudSyncStatus('local');
        console.warn('Catálogo guardado localmente, error en Supabase:', uploadRes.error);
      }
    } catch (err) {
      setCloudSyncStatus('local');
      console.warn('Error sincronizando con Supabase:', err);
    } finally {
      setIsUploadingCloud(false);
      setTimeout(() => {
        setCloudProgress(null);
        setSuccessMessage(null);
        onClose();
      }, 1800);
    }
  };

  const handleUploadCurrentToCloud = async () => {
    if (PRODUCT_CATALOG.length === 0) {
      alert('No hay productos armados en el catálogo local para subir.');
      return;
    }

    setIsUploadingCloud(true);
    setCloudSyncStatus('uploading');
    try {
      const uploadRes = await uploadCatalogToSupabase(PRODUCT_CATALOG, {
        fileName: 'Catalogo_Local_Subido.xlsx',
        mode: 'replace',
        sourceType: 'excel',
        onProgress: (p) => setCloudProgress(p),
      });

      if (uploadRes.success) {
        setCloudSyncStatus('synced');
        setSuccessMessage(`¡Catálogo local completo (${uploadRes.count} armados) subido a Supabase!`);
      } else {
        setSuccessMessage(`Error subiendo a Supabase: ${uploadRes.error}`);
      }
    } catch (e: any) {
      setSuccessMessage(`Error: ${e?.message || String(e)}`);
    } finally {
      setIsUploadingCloud(false);
      setTimeout(() => {
        setCloudProgress(null);
        setSuccessMessage(null);
      }, 3500);
    }
  };

  const handleClearCatalog = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Estás seguro de vaciar el catálogo?',
      itemType: 'Catálogo de Producción',
      itemName: 'Todas las claves de armados y componentes',
      message: 'Esta acción removerá todas las claves registradas en el catálogo local y en la base de datos de Supabase para que puedas cargar un archivo nuevo desde cero.',
      confirmText: 'Sí, vaciar catálogo',
      onConfirm: async () => {
        // 1. Limpiar localmente
        await resetCustomCatalog();
        if (onCatalogUpdated) {
          onCatalogUpdated(PRODUCT_CATALOG);
        }

        // 2. Limpiar en Supabase
        try {
          await clearCatalogFromSupabase();
        } catch (e) {
          console.warn('Error limpiando en Supabase:', e);
        }

        setSuccessMessage('Catálogo vaciado en la aplicación y en Supabase. Puedes cargar tu archivo Excel o CSV.');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 2500);
      },
    });
  };

  const handleProcessPasted = () => {
    let armados: ProductComboItem[] = [];

    // Modo 1 sola tabla (5 columnas o 4 columnas o 2 columnas)
    if (pasteSingleText.trim()) {
      armados = parsePastedCsvText(pasteSingleText, pasteMode);
    } else if (pasteIndividualesText.trim() || pasteArmadosText.trim()) {
      const armadosList = pasteArmadosText.trim()
        ? parsePastedCsvText(pasteArmadosText, 'armados')
        : [];
      const indList = pasteIndividualesText.trim()
        ? parsePastedCsvText(pasteIndividualesText, 'individuales')
        : [];

      const map = new Map<string, ProductComboItem>();
      armadosList.forEach((a) => map.set(a.sku.toUpperCase(), a));

      indList.forEach((ind) => {
        const sku = ind.sku.toUpperCase();
        const cleanComps: ProductComponentItem[] = [];
        const seenComps = new Set<string>();
        (ind.componentes || []).forEach((c) => {
          const k = (c.sku || c.desc || '').toUpperCase().trim();
          if (!k || seenComps.has(k)) return;
          seenComps.add(k);
          cleanComps.push({ ...c });
        });

        if (!map.has(sku)) {
          map.set(sku, { ...ind, componentes: cleanComps });
        } else {
          const existing = map.get(sku)!;
          existing.componentes = cleanComps;
        }
      });

      armados = Array.from(map.values());
    } else {
      alert('Por favor pega el texto copiado de tus celdas de Excel.');
      return;
    }

    let totalComponentes = 0;
    let armadosConDescripcion = 0;
    armados.forEach((a) => {
      totalComponentes += a.componentes?.length || 0;
      if (a.desc && !a.desc.startsWith('ARMADO ') && a.desc.toUpperCase() !== a.sku.toUpperCase()) {
        armadosConDescripcion++;
      }
    });

    const res: ParseCatalogResult = {
      success: armados.length > 0,
      armados,
      stats: {
        totalArmados: armados.length,
        totalComponentes,
        armadosConDescripcion,
        sheetsFound: ['Texto Pegado'],
      },
      warnings: [],
      errors: armados.length === 0 ? ['No se pudieron identificar armados válidos en el texto pegado.'] : [],
    };

    setParseResult(res);
    setActiveTab('excel'); // Mover a vista de revisión
  };

  const filteredPreviewArmados = (parseResult?.armados || []).filter((a) => {
    const q = searchFilter.trim().toUpperCase();
    if (!q) return true;
    if (a.sku.toUpperCase().includes(q)) return true;
    if (a.desc.toUpperCase().includes(q)) return true;
    return (a.componentes || []).some(
      (c) => c.sku.toUpperCase().includes(q) || c.desc.toUpperCase().includes(q)
    );
  });

  const filteredCurrentCatalog = PRODUCT_CATALOG.filter((a) => {
    const q = inspectSearch.trim().toUpperCase();
    if (!q) return true;
    if (a.sku.toUpperCase().includes(q)) return true;
    if (a.desc.toUpperCase().includes(q)) return true;
    return (a.componentes || []).some(
      (c) => c.sku.toUpperCase().includes(q) || c.desc.toUpperCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-700 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Carga de Claves de Armados y Componentes
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Excel (.xlsx) / CSV
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Sube tu catálogo de producción para que la app autocomplete claves armadas, descripciones y piezas individuales.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Supabase Status Pill & Sync Button */}
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-xl">
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isUploadingCloud || isSyncingCloud ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isUploadingCloud || isSyncingCloud ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                </span>
                <span className="text-slate-200 font-semibold hidden sm:inline">
                  {isUploadingCloud ? 'Subiendo a Supabase...' : isSyncingCloud ? 'Descargando...' : 'Supabase Conectado'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSyncFromCloud}
                disabled={isSyncingCloud || isUploadingCloud}
                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded-md font-bold transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                title="Sincronizar catálogo desde la base de datos Supabase"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE PROGRESO DE SUPABASE */}
        {cloudProgress && (
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 text-xs text-white animate-in fade-in">
            <div className="flex items-center justify-between font-bold mb-1">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CloudUpload className="w-4 h-4 animate-bounce" />
                <span>{cloudProgress.stage}</span>
              </div>
              <span className="text-slate-300 font-mono">{cloudProgress.percentage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${cloudProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* NOTIFICACIÓN DE ÉXITO */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* TABS DE NAVEGACIÓN */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex space-x-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-white text-slate-900 border-t-2 border-x-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Subir Archivo Excel o CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white text-slate-900 border-t-2 border-x-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Copiar y Pegar Texto de Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'view'
                ? 'bg-white text-slate-900 border-t-2 border-x-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Ver Catálogo en la App ({PRODUCT_CATALOG.length})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SUBIR ARCHIVO */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              {/* GUÍA RÁPIDA: ¿1 PESTAÑA O 2 PESTAÑAS? */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs sm:text-sm">
                  <Info className="w-4 h-4" />
                  <span>¿Es mejor 1 sola pestaña o 2 pestañas? Soportamos ambas:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Opción 1 */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                      Opción A • Muy Práctica
                    </span>
                    <h4 className="font-bold text-slate-100 text-xs mt-1">1 sola pestaña (CSV o Excel)</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Pon las 5 columnas juntas: <em>[Claves armados, Descripcion de producto armado, Claves individuales, Cantidad, Descripcion de claves individuales]</em>.
                    </p>
                  </div>

                  {/* Opción 2 */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="bg-blue-500/20 text-blue-300 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                      Opción B • 2 Pestañas en Excel
                    </span>
                    <h4 className="font-bold text-slate-100 text-xs mt-1">Guardar como .xlsx</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      En Excel guárdalo como <strong>"Libro de Excel (*.xlsx)"</strong>. (Nota: los archivos .csv no permiten guardar 2 pestañas en Excel).
                    </p>
                  </div>

                  {/* Opción 3 */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="bg-purple-500/20 text-purple-300 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                      Opción C • Dos archivos CSV
                    </span>
                    <h4 className="font-bold text-slate-100 text-xs mt-1">Arrastra ambos CSV a la vez</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Si tienes <code>Claves_individuales.csv</code> y <code>Claves_armados.csv</code> separados, arrastra ambos archivos juntos aquí.
                    </p>
                  </div>
                </div>

                {/* BOTONES DE DESCARGA DE PLANTILLAS */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Plantillas de ejemplo listas para usar:</span>
                  <button
                    type="button"
                    onClick={generateCatalogTemplateFile}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Plantilla Excel (.xlsx de 2 pestañas y 1 hoja)</span>
                  </button>
                  <button
                    type="button"
                    onClick={generateSingleSheetCsvTemplate}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Plantilla CSV (1 sola hoja, 5 columnas)</span>
                  </button>
                </div>
              </div>

              {/* ZONA DRAG AND DROP */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-emerald-600 bg-emerald-50 scale-[0.99]'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                }`}
              >
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 mx-auto bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-emerald-600 shadow-md">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                      Arrastra tu archivo Excel o CSV aquí
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Puedes seleccionar o arrastrar uno o varios archivos (ej. libro <code>.xlsx</code> o ambos <code>.csv</code>)
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md inline-flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>{isProcessing ? 'Procesando archivo(s)...' : 'Seleccionar Archivo(s) de mi Computadora'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* ERRORES O AVISOS */}
              {parseResult && !parseResult.success && parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-900 space-y-1 animate-in fade-in">
                  <div className="flex items-center space-x-2 font-bold text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>No se pudo procesar el archivo:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1 text-red-800 pl-1">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* VISTA PREVIA DE ARMADOS PROCESADOS */}
              {parseResult && parseResult.success && parseResult.armados.length > 0 && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-in fade-in">
                  {/* BARRA DE ESTADO DEL ARCHIVO */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-black text-slate-900 text-sm">
                          {parseResult.stats.totalArmados} Productos Armados Extraídos
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          {parseResult.stats.armadosConDescripcion} con descripción de armado
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                          {parseResult.stats.totalComponentes} piezas individuales vinculadas
                        </span>
                        <span className="text-slate-500">
                          Hojas leídas: <strong>{parseResult.stats.sheetsFound.join(', ')}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplyCatalog(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                        title="Reemplaza el catálogo de la app exclusivamente con estos nuevos productos"
                      >
                        <Check className="w-4 h-4" />
                        <span>Guardar en el Sistema</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyCatalog(false)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                        title="Une estos armados con los que ya existían previamente"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Combinar</span>
                      </button>
                    </div>
                  </div>

                  {/* BUSCADOR DENTRO DE LA VISTA PREVIA */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filtrar por clave armada (ej. C0079), clave individual o descripción..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* LISTA PREVIA */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
                    {filteredPreviewArmados.map((item) => {
                      const isExpanded = expandedSkus.has(item.sku);
                      const compCount = item.componentes?.length || 0;
                      const hasRealDesc =
                        item.desc &&
                        !item.desc.startsWith('ARMADO ') &&
                        item.desc.toUpperCase() !== item.sku.toUpperCase();

                      return (
                        <div key={item.sku} className="text-xs">
                          <div
                            onClick={() => toggleExpandSku(item.sku)}
                            className="p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="text-slate-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </span>
                              <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.sku}
                              </span>
                              <span
                                className={`font-semibold truncate max-w-sm sm:max-w-md ${
                                  hasRealDesc ? 'text-slate-800' : 'text-amber-700 italic'
                                }`}
                              >
                                {item.desc || `ARMADO ${item.sku}`}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 text-[11px]">
                              {hasRealDesc ? (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                                  Desc. OK
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                                  Sin desc. de armado
                                </span>
                              )}
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                                {compCount} {compCount === 1 ? 'pieza ind.' : 'piezas ind.'}
                              </span>
                            </div>
                          </div>

                          {isExpanded && item.componentes && item.componentes.length > 0 && (
                            <div className="bg-slate-50/70 p-3 pl-8 border-t border-slate-100 space-y-1.5 animate-in fade-in">
                              <table className="w-full text-left text-[11px] border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                                  <tr>
                                    <th className="p-1.5 px-2 border-b">Clave Individual</th>
                                    <th className="p-1.5 px-2 border-b">Descripción de Pieza Individual</th>
                                    <th className="p-1.5 px-2 border-b text-center">Cantidad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.componentes.map((c, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                                      <td className="p-1.5 px-2 font-mono font-bold text-slate-800">{c.sku}</td>
                                      <td className="p-1.5 px-2 text-slate-600">{c.desc}</td>
                                      <td className="p-1.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/40">
                                        {c.cantidad} {c.unidad || 'pza'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COPIAR Y PEGAR TEXTO */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-950 text-xs flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Pega directo desde Excel:</strong> Puedes seleccionar las celdas en tu Excel, presionar <code>Ctrl + C</code> y pegarlas aquí directamente con <code>Ctrl + V</code>.
                </div>
              </div>

              {/* Selector de tipo de pegado */}
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPasteMode('auto')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    pasteMode === 'auto' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tabla Única (5 o 4 columnas)
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode('armados')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    pasteMode === 'armados' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Solo Claves Armados (2 columnas)
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Pega las celdas de Excel aquí:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {pasteMode === 'armados'
                      ? 'Formato: [Claves armados] [Descripción de producto armado]'
                      : 'Formato: [Claves armados] [Descripción de producto armado] [Claves individuales] [Cantidad] [Descripción individual]'}
                  </span>
                </label>
                <textarea
                  rows={9}
                  value={pasteSingleText}
                  onChange={(e) => setPasteSingleText(e.target.value)}
                  placeholder={`Claves armados\tDescripcion de producto armado\tClaves individuales\tCantidad\tDescripcion de claves individuales\nAI26058-01\tBATERIA TOTALY 32 PIEZAS CV SHOPPING\tAI21369\t1\tSET DE CUCHILLOS 4 PZAS CON MANGO NEGRO\nANZO-05\tKIT DE ACCESORIOS DE COCINA // N2\tANZO-UTEC-001\t1\tBASE PARA VAPORERA DE SILICON`}
                  className="w-full p-2.5 font-mono text-[11px] border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessPasted}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Procesar Texto Pegado y Ver Resultados</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VER CATÁLOGO ACTIVO */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {PRODUCT_CATALOG.length} Productos Armados Registrados en la App
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {PRODUCT_CATALOG.length === 0
                      ? 'El catálogo se encuentra limpio. Sube tu archivo Excel o CSV para ingresar tus claves.'
                      : 'Estos productos están disponibles de forma inmediata en el buscador y el formato.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUploadCurrentToCloud}
                    disabled={isUploadingCloud || PRODUCT_CATALOG.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Guarda todas las claves actuales en la base de datos Supabase para compartirlas"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Subir a Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncFromCloud}
                    disabled={isSyncingCloud}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-300 flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                    title="Descargar la versión más reciente del catálogo desde Supabase"
                  >
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Descargar de Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={generateCatalogTemplateFile}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-300 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCatalog}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 flex items-center space-x-1.5 transition cursor-pointer"
                    title="Vacía el catálogo completamente en la app y en Supabase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Catálogo</span>
                  </button>
                </div>
              </div>

              {PRODUCT_CATALOG.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <Database className="w-8 h-8 mx-auto text-slate-400" />
                  <h4 className="font-bold text-slate-800 text-sm">No hay claves de ejemplo</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Se han eliminado las claves de ejemplo. Puedes subir tu archivo Excel o CSV en la pestaña <strong>"Subir Archivo Excel o CSV"</strong> para cargar tus 2,530+ armados reales.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('excel')}
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Cargar mi archivo ahora
                  </button>
                </div>
              ) : (
                <>
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={inspectSearch}
                      onChange={(e) => setInspectSearch(e.target.value)}
                      placeholder="Buscar en el catálogo del sistema..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Lista */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
                    {filteredCurrentCatalog.map((item) => {
                      const isExpanded = expandedSkus.has(item.sku);
                      const compCount = item.componentes?.length || 0;
                      const totalPzas = (item.componentes || []).reduce((acc, c) => acc + c.cantidad, 0);

                      return (
                        <div key={item.sku} className="text-xs">
                          <div
                            onClick={() => toggleExpandSku(item.sku)}
                            className="p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="text-slate-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </span>
                              <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.sku}
                              </span>
                              <span className="font-semibold text-slate-700 truncate max-w-sm">
                                {item.desc}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 text-[11px]">
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                                {compCount} {compCount === 1 ? 'clave ind.' : 'claves ind.'}
                              </span>
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                                {totalPzas} pzas
                              </span>
                            </div>
                          </div>

                          {isExpanded && item.componentes && item.componentes.length > 0 && (
                            <div className="bg-slate-50/70 p-3 pl-8 border-t border-slate-100 space-y-1.5 animate-in fade-in">
                              <table className="w-full text-left text-[11px] border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                                  <tr>
                                    <th className="p-1.5 px-2 border-b">Clave Individual</th>
                                    <th className="p-1.5 px-2 border-b">Descripción de Clave Individual</th>
                                    <th className="p-1.5 px-2 border-b text-center">Cantidad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.componentes.map((c, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                                      <td className="p-1.5 px-2 font-mono font-bold text-slate-800">{c.sku}</td>
                                      <td className="p-1.5 px-2 text-slate-600">{c.desc}</td>
                                      <td className="p-1.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/40">
                                        {c.cantidad} {c.unidad || 'pza'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 font-mono text-[11px]">
            Soporta: Excel (.xlsx con 2 pestañas) • CSV (1 pestaña con 5 columnas) • Multi-archivo CSV
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación para vaciar catálogo */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        itemName={confirmModal.itemName}
        itemType={confirmModal.itemType}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
};
