import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  History,
  Plus,
  FileText,
  Trash2,
  RefreshCw,
  Edit3,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { QualityReport, LotStatus } from '../types/qualityReport';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ReportHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  reports: QualityReport[];
  activeReportId: string;
  onSelectReport: (report: QualityReport) => void;
  onNewReport: () => void;
  onUpdateReport?: (report: QualityReport) => void;
  onDeleteReport: (id: string) => void;
  onResetSamples: () => void;
  onSyncWithSupabase?: () => Promise<void>;
  isSyncing?: boolean;
}

const REQUIRED_DELETE_PASSWORD = 'CVD_PMC_APP_CAL_01';

export const ReportHistorySidebar: React.FC<ReportHistorySidebarProps> = ({
  isOpen,
  onClose,
  reports,
  activeReportId,
  onSelectReport,
  onNewReport,
  onUpdateReport,
  onDeleteReport,
  onResetSamples,
  onSyncWithSupabase,
  isSyncing = false,
}) => {
  // Estado para confirmación de borrado
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName?: string;
    itemType?: string;
    message?: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '¿Estás seguro de borrar este elemento?',
    onConfirm: () => {},
  });

  // Estado para el contador de 9 toques en el recuadro amarillo
  const [yellowClickCount, setYellowClickCount] = useState<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para habilitar/deshabilitar los botones de borrado
  const [isDeleteUnlocked, setIsDeleteUnlocked] = useState<boolean>(false);

  // Modal para ingresar contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notificación tipo toast interna
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modal para edición rápida de reporte
  const [editingReport, setEditingReport] = useState<QualityReport | null>(null);
  const [editForm, setEditForm] = useState<{
    folioOT: string;
    folioMaquila: string;
    skuArmado: string;
    descripcionArmado: string;
    cliente: string;
    inspectorName: string;
    status: LotStatus;
    totalLotSize: number;
  }>({
    folioOT: '',
    folioMaquila: '',
    skuArmado: '',
    descripcionArmado: '',
    cliente: '',
    inspectorName: '',
    status: 'APROBADO',
    totalLotSize: 0,
  });

  // Auto-limpiar notificaciones
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Manejador del clic en el recuadro amarillo del encabezado
  const handleYellowBoxClick = () => {
    const nextCount = yellowClickCount + 1;

    // Resetear timer de inactividad (4 segundos para continuar la secuencia)
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setYellowClickCount(0);
    }, 4000);

    if (nextCount >= 9) {
      // Secuencia completada: abrir modal de contraseña
      setYellowClickCount(0);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      setEnteredPassword('');
      setPasswordError(null);
      setIsPasswordModalOpen(true);
    } else {
      setYellowClickCount(nextCount);
    }
  };

  // Validación de la contraseña ingresada
  const handleValidatePassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (enteredPassword === REQUIRED_DELETE_PASSWORD) {
      const newUnlockedState = !isDeleteUnlocked;
      setIsDeleteUnlocked(newUnlockedState);
      setIsPasswordModalOpen(false);
      setEnteredPassword('');
      setPasswordError(null);

      if (newUnlockedState) {
        setNotification({
          type: 'success',
          message: '🔓 Botones de borrado HABILITADOS. Ya puedes eliminar reportes.',
        });
      } else {
        setNotification({
          type: 'info',
          message: '🔒 Botones de borrado DESHABILITADOS y protegidos.',
        });
      }
    } else {
      setPasswordError('Contraseña incorrecta. Acceso de seguridad denegado.');
    }
  };

  // Abrir modal de edición rápida
  const handleStartEdit = (rep: QualityReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReport(rep);
    setEditForm({
      folioOT: rep.folioOT,
      folioMaquila: rep.folioMaquila || '',
      skuArmado: rep.skuArmado,
      descripcionArmado: rep.descripcionArmado || '',
      cliente: rep.cliente || '',
      inspectorName: rep.inspectorName,
      status: rep.status,
      totalLotSize: rep.totalLotSize || 0,
    });
  };

  // Guardar edición rápida
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !onUpdateReport) return;

    const updated: QualityReport = {
      ...editingReport,
      folioOT: editForm.folioOT.trim().toUpperCase(),
      folioMaquila: editForm.folioMaquila.trim(),
      skuArmado: editForm.skuArmado.trim().toUpperCase(),
      descripcionArmado: editForm.descripcionArmado.trim(),
      cliente: editForm.cliente.trim(),
      inspectorName: editForm.inspectorName.trim(),
      status: editForm.status,
      totalLotSize: Number(editForm.totalLotSize) || 0,
      updatedAt: new Date().toISOString(),
    };

    onUpdateReport(updated);
    setEditingReport(null);
    setNotification({
      type: 'success',
      message: `Reporte ${updated.folioOT} actualizado en Supabase y memoria.`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end no-print font-sans">
      <div className="bg-[#FAF9F6] w-full sm:max-w-md h-full shadow-2xl flex flex-col border-l border-neutral-300 animate-in slide-in-from-right duration-200">
        
        {/* Header - Fixed */}
        <div className="flex-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
            {/* RECUADRO AMARILLO INTERACTIVO: 9 toques para solicitar contraseña */}
            <div
              id="yellow-header-box-security"
              onClick={handleYellowBoxClick}
              className={`relative bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 p-2 rounded-xl font-black shadow-md shadow-amber-500/20 shrink-0 ring-1 ring-amber-300/40 cursor-pointer select-none transition active:scale-90 hover:brightness-110 ${
                yellowClickCount > 0 ? 'ring-2 ring-amber-200 animate-pulse' : ''
              }`}
              title="Historial de Auditorías (Toca 9 veces para configuración de borrado)"
              role="button"
              tabIndex={0}
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              {yellowClickCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                  {yellowClickCount}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide">
                  HISTORIAL DE REPORTES
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                  {reports.length} {reports.length === 1 ? 'LOTE' : 'LOTES'}
                </span>
                {isDeleteUnlocked && (
                  <button
                    onClick={() => {
                      setIsDeleteUnlocked(false);
                      setNotification({
                        type: 'info',
                        message: '🔒 Botones de borrado bloqueados.',
                      });
                    }}
                    className="bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-red-500/30 transition cursor-pointer"
                    title="Hacer clic para volver a bloquear el borrado"
                  >
                    <Unlock className="w-2.5 h-2.5 text-red-400" />
                    <span>Borrado Habilitado</span>
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-300 font-mono mt-0.5 flex-wrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">Trazabilidad Maquila</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Auditorías Guardadas</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white p-2 rounded-xl border border-slate-700/60 transition active:scale-95 shrink-0 cursor-pointer"
            aria-label="Cerrar historial"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Notificación flotante */}
        {notification && (
          <div
            className={`px-3 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : notification.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-500 hover:text-neutral-900 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action bar - Fixed */}
        <div className="flex-none p-3 sm:p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => {
              onNewReport();
              onClose();
            }}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl transition active:scale-98 shadow-md shadow-amber-500/20 border border-amber-300/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Reporte</span>
          </button>

          {/* Botón de Sincronización con Supabase */}
          <button
            onClick={async () => {
              if (onSyncWithSupabase) {
                try {
                  await onSyncWithSupabase();
                  setNotification({
                    type: 'success',
                    message: 'Historial sincronizado con Supabase.',
                  });
                } catch {
                  setNotification({
                    type: 'error',
                    message: 'Error de sincronización con Supabase.',
                  });
                }
              }
            }}
            disabled={isSyncing}
            className={`p-2.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300 rounded-xl transition active:scale-95 shrink-0 cursor-pointer ${
              isSyncing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Sincronizar historial con Supabase"
            aria-label="Sincronizar con Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>

        {/* Reports List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3 text-xs">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="font-serif italic text-sm">No hay reportes guardados.</p>
              <button
                onClick={onNewReport}
                className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
              >
                Crear primer reporte
              </button>
            </div>
          ) : (
            reports.map((rep) => {
              const isActive = rep.id === activeReportId;
              const isApproved = rep.status === 'APROBADO';
              const isRejected = rep.status === 'RECHAZADO';

              return (
                <div
                  key={rep.id}
                  onClick={() => {
                    onSelectReport(rep);
                    onClose();
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition relative group active:scale-99 shadow-xs ${
                    isActive
                      ? 'border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900'
                      : 'border-neutral-300 bg-white hover:border-neutral-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono font-black text-neutral-900 text-xs">
                          {rep.folioOT || 'SIN FOLIO'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-black ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : isRejected
                              ? 'bg-red-100 text-red-950 border border-red-300'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-neutral-700 text-xs font-medium mt-1 leading-snug break-words">
                        {rep.skuArmado || 'Sin SKU'} {rep.cliente ? `• ${rep.cliente}` : ''}
                      </p>
                      {rep.descripcionArmado && (
                        <p className="text-neutral-500 text-[11px] truncate mt-0.5">
                          {rep.descripcionArmado}
                        </p>
                      )}
                    </div>

                    {/* Botones de acción en la tarjeta */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Botón de edición rápida */}
                      <button
                        onClick={(e) => handleStartEdit(rep, e)}
                        className="text-neutral-400 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                        title="Editar datos del reporte"
                        aria-label="Editar datos"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botón de borrado: SOLO VISIBLE SI SE DESBLOQUEÓ CON LAS 9 PULSACIONES Y CONTRASEÑA */}
                      {isDeleteUnlocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({
                              isOpen: true,
                              title: '¿Estás seguro de borrar este reporte?',
                              itemType: 'Reporte de Inspección',
                              itemName: `${rep.folioOT || 'Sin Folio'} - ${rep.skuArmado || 'Sin SKU'}`,
                              message: `Este reporte con estatus ${rep.status} será eliminado permanentemente de la base de datos de Supabase y del historial local.`,
                              confirmText: 'Sí, borrar de Supabase',
                              onConfirm: () => onDeleteReport(rep.id),
                            });
                          }}
                          className="text-red-500 hover:text-white p-1.5 rounded-lg hover:bg-red-600 bg-red-50 border border-red-200 transition cursor-pointer"
                          title="Eliminar reporte de Supabase"
                          aria-label="Eliminar reporte"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details metadata */}
                  <div className="mt-2.5 pt-2 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span className="truncate max-w-[140px]">
                      Inspector: {rep.inspectorName ? rep.inspectorName.split(' ')[0] : 'N/A'}
                    </span>
                    <span>{rep.inspectionDate || 'Sin fecha'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info con estado de borrado */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 font-mono flex items-center justify-between px-4">
          <span className="flex items-center gap-1">
            <Cloud className="w-3 h-3 text-emerald-600" />
            <span>Supabase Cloud Sync</span>
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            {isDeleteUnlocked ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Borrado activo
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Borrado protegido
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONTRASEÑA: ACTIVADO TRAS 9 CLICS EN EL RECUADRO AMARILLO       */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Desbloqueo de Seguridad</h4>
                  <p className="text-[11px] text-slate-400">Gestión de Borrado de Reportes</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleValidatePassword} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold">
                    {isDeleteUnlocked
                      ? 'Ingresa la clave para DESHABILITAR el borrado:'
                      : 'Ingresa la clave maestra para HABILITAR el borrado:'}
                  </span>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Contraseña de autorización"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isDeleteUnlocked ? 'Deshabilitar Borrado' : 'Habilitar Borrado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDICIÓN RÁPIDA DE REPORTE                                        */}
      {/* ========================================================================= */}
      {editingReport && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setEditingReport(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Editar Datos del Reporte</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{editingReport.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Folio OT
                  </label>
                  <input
                    type="text"
                    value={editForm.folioOT}
                    onChange={(e) => setEditForm({ ...editForm, folioOT: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Folio Maquila
                  </label>
                  <input
                    type="text"
                    value={editForm.folioMaquila}
                    onChange={(e) => setEditForm({ ...editForm, folioMaquila: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SKU Armado
                  </label>
                  <input
                    type="text"
                    value={editForm.skuArmado}
                    onChange={(e) => setEditForm({ ...editForm, skuArmado: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estatus
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LotStatus })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="APROBADO">APROBADO</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                    <option value="CONDICIONADO">CONDICIONADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción del Armado
                </label>
                <input
                  type="text"
                  value={editForm.descripcionArmado}
                  onChange={(e) => setEditForm({ ...editForm, descripcionArmado: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ej. SET DE 10 PIEZAS JADECOOK CHEF"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inspector Calidad
                  </label>
                  <input
                    type="text"
                    value={editForm.inspectorName}
                    onChange={(e) => setEditForm({ ...editForm, inspectorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Piezas Lote (N)
                  </label>
                  <input
                    type="number"
                    value={editForm.totalLotSize}
                    onChange={(e) => setEditForm({ ...editForm, totalLotSize: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onSelectReport(editingReport);
                    setEditingReport(null);
                    onClose();
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Abrir en Editor Completo
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingReport(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ventana de confirmación de borrado */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        itemName={deleteModal.itemName}
        itemType={deleteModal.itemType}
        message={deleteModal.message}
        confirmText={deleteModal.confirmText}
      />
    </div>
  );
};
