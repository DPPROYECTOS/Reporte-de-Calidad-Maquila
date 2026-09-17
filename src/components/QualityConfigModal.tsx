import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  Camera,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  PhotoSectionConfig,
  getStoredInspectors,
  saveStoredInspectors,
  resetStoredInspectors,
  getStoredPhotoSections,
  saveStoredPhotoSections,
  resetStoredPhotoSections,
  syncInspectorsFromSupabase,
  addInspectorToSupabase,
  updateInspectorInSupabase,
  deleteInspectorFromSupabase,
  seedDefaultInspectorsToSupabase,
  syncPhotoSectionsFromSupabase,
  savePhotoSectionToSupabase,
  updatePhotoSectionInSupabase,
  deletePhotoSectionFromSupabase,
  seedDefaultPhotoSectionsToSupabase,
} from '../utils/appConfigStore';
import { Database, Cloud, CloudCheck } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface QualityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'inspectors' | 'photos';
}

const COMMON_EMOJIS = ['🎯', '🏭', '📦', '🏗️', '⚖️', '🏷️', '📋', '🔍', '📸', '🛡️', '🔬', '📐', '🚚', '✅'];

export const QualityConfigModal: React.FC<QualityConfigModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'inspectors',
}) => {
  const [activeTab, setActiveTab] = useState<'inspectors' | 'photos'>(initialTab);

  // Inspectores State
  const [inspectors, setInspectors] = useState<string[]>([]);
  const [newInspectorName, setNewInspectorName] = useState<string>('');
  const [editingInspectorIndex, setEditingInspectorIndex] = useState<number | null>(null);
  const [editingInspectorValue, setEditingInspectorValue] = useState<string>('');
  const [inspectorError, setInspectorError] = useState<string | null>(null);

  // Secciones de Fotos State
  const [photoSections, setPhotoSections] = useState<PhotoSectionConfig[]>([]);
  const [isCreatingSection, setIsCreatingSection] = useState<boolean>(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Formulario de nueva / edición de sección
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const [sectionSubtitle, setSectionSubtitle] = useState<string>('');
  const [sectionGuide, setSectionGuide] = useState<string>('');
  const [sectionIcon, setSectionIcon] = useState<string>('📸');
  const [sectionRequired, setSectionRequired] = useState<boolean>(true);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'local'>('idle');

  // Estado para la ventana de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState<{
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

  // Cargar datos al abrir (Local inmediato + Supabase en segundo plano)
  useEffect(() => {
    if (isOpen) {
      setInspectors(getStoredInspectors());
      setPhotoSections(getStoredPhotoSections());
      setEditingInspectorIndex(null);
      setIsCreatingSection(false);
      setEditingSectionId(null);
      setInspectorError(null);
      setSectionError(null);

      // Sincronización en la nube con Supabase
      setCloudSyncStatus('syncing');
      Promise.all([
        syncInspectorsFromSupabase(),
        syncPhotoSectionsFromSupabase(),
      ])
        .then(([inspRes, secRes]) => {
          if (inspRes.fromCloud && inspRes.data.length > 0) {
            setInspectors(inspRes.data);
          }
          if (secRes.fromCloud && secRes.data.length > 0) {
            setPhotoSections(secRes.data);
          }
          setCloudSyncStatus(inspRes.fromCloud || secRes.fromCloud ? 'synced' : 'local');
        })
        .catch((err) => {
          console.warn('Error sincronizando con Supabase:', err);
          setCloudSyncStatus('local');
        });
    }
  }, [isOpen]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  if (!isOpen) return null;

  // ==================== INSPECTORES LOGIC ====================

  const handleAddInspector = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newInspectorName.trim();
    if (!trimmed) {
      setInspectorError('Ingresa el nombre del inspector.');
      return;
    }
    if (inspectors.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
      setInspectorError('Este inspector ya está registrado.');
      return;
    }

    const updated = [...inspectors, trimmed];
    setInspectors(updated);
    saveStoredInspectors(updated);
    addInspectorToSupabase(trimmed, updated.length);
    setNewInspectorName('');
    setInspectorError(null);
    showNotification(`✓ Inspector "${trimmed}" agregado y sincronizado con Supabase`);
  };

  const handleStartEditInspector = (index: number) => {
    setEditingInspectorIndex(index);
    setEditingInspectorValue(inspectors[index]);
    setInspectorError(null);
  };

  const handleSaveEditInspector = (index: number) => {
    const trimmed = editingInspectorValue.trim();
    if (!trimmed) {
      setInspectorError('El nombre no puede quedar vacío.');
      return;
    }
    if (
      inspectors.some(
        (name, i) => i !== index && name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setInspectorError('Ya existe otro inspector con este nombre.');
      return;
    }

    const oldName = inspectors[index];
    const updated = [...inspectors];
    updated[index] = trimmed;
    setInspectors(updated);
    saveStoredInspectors(updated);
    updateInspectorInSupabase(oldName, trimmed);
    setEditingInspectorIndex(null);
    setEditingInspectorValue('');
    setInspectorError(null);
    showNotification(`✓ Inspector modificado a "${trimmed}" en Supabase`);
  };

  const handleDeleteInspector = (index: number) => {
    const targetName = inspectors[index];
    if (inspectors.length <= 1) {
      setInspectorError('Debe haber al menos un inspector en la lista.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '¿Estás seguro de borrar este inspector?',
      itemType: 'Inspector de Calidad',
      itemName: targetName,
      message: 'Este inspector será eliminado del catálogo activo y de la base de datos de Supabase. Dejará de aparecer en la lista desplegable de nuevos lotes.',
      confirmText: 'Sí, borrar inspector',
      onConfirm: () => {
        const updated = inspectors.filter((_, i) => i !== index);
        setInspectors(updated);
        saveStoredInspectors(updated);
        deleteInspectorFromSupabase(targetName);
        if (editingInspectorIndex === index) {
          setEditingInspectorIndex(null);
        }
        showNotification(`✓ Inspector "${targetName}" eliminado de Supabase`);
      },
    });
  };

  const handleResetInspectors = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Restablecer inspectores predeterminados?',
      itemName: 'Lista oficial de Calidad',
      message: '¿Deseas restablecer la lista a los 6 inspectores originales predeterminados? Se restaurarán en la base de datos de Supabase.',
      confirmText: 'Sí, restablecer lista',
      onConfirm: () => {
        const resetList = resetStoredInspectors();
        setInspectors(resetList);
        seedDefaultInspectorsToSupabase();
        setEditingInspectorIndex(null);
        showNotification('✓ Lista de inspectores restablecida a los valores originales en Supabase');
      },
    });
  };

  // ==================== SECCIONES DE FOTOS LOGIC ====================

  const handleOpenCreateSection = () => {
    const nextNumber = photoSections.length + 1;
    setSectionTitle(`${nextNumber}. Nueva Evidencia Fotográfica`);
    setSectionSubtitle('Referencia del aspecto a fotografiar');
    setSectionGuide('Toma foto nítida verificando las especificaciones requeridas.');
    setSectionIcon('📸');
    setSectionRequired(true);
    setSectionError(null);
    setEditingSectionId(null);
    setIsCreatingSection(true);
  };

  const handleStartEditSection = (section: PhotoSectionConfig) => {
    setEditingSectionId(section.id);
    setSectionTitle(section.title);
    setSectionSubtitle(section.subtitle);
    setSectionGuide(section.guide);
    setSectionIcon(section.icon || '📸');
    setSectionRequired(section.required !== false);
    setSectionError(null);
    setIsCreatingSection(false);
  };

  const handleCancelSectionForm = () => {
    setIsCreatingSection(false);
    setEditingSectionId(null);
    setSectionError(null);
  };

  const handleSaveSection = () => {
    const trimmedTitle = sectionTitle.trim();
    if (!trimmedTitle) {
      setSectionError('El título de la sección es obligatorio.');
      return;
    }

    if (isCreatingSection) {
      // Crear nueva sección
      const uniqueId = `section_${Date.now()}`;
      const newSection: PhotoSectionConfig = {
        id: uniqueId,
        key: uniqueId,
        title: trimmedTitle,
        subtitle: sectionSubtitle.trim() || 'Evidencia fotográfica adicional',
        guide: sectionGuide.trim() || 'Toma fotografía clara de la evidencia.',
        icon: sectionIcon || '📸',
        required: sectionRequired,
        isStandard: false,
        displayOrder: photoSections.length + 1,
      };

      const updated = [...photoSections, newSection];
      setPhotoSections(updated);
      saveStoredPhotoSections(updated);
      savePhotoSectionToSupabase(newSection, updated.length);
      setIsCreatingSection(false);
      showNotification(`✓ Sección "${trimmedTitle}" creada y guardada en Supabase`);
    } else if (editingSectionId) {
      // Modificar existente
      let modifiedSection: PhotoSectionConfig | null = null;
      const updated = photoSections.map((sec) => {
        if (sec.id === editingSectionId) {
          modifiedSection = {
            ...sec,
            title: trimmedTitle,
            subtitle: sectionSubtitle.trim() || sec.subtitle,
            guide: sectionGuide.trim() || sec.guide,
            icon: sectionIcon || sec.icon,
            required: sectionRequired,
          };
          return modifiedSection;
        }
        return sec;
      });

      setPhotoSections(updated);
      saveStoredPhotoSections(updated);
      if (modifiedSection) {
        updatePhotoSectionInSupabase(modifiedSection);
      }
      setEditingSectionId(null);
      showNotification(`✓ Sección actualizada en Supabase exitosamente`);
    }
  };

  const handleDeleteSection = (section: PhotoSectionConfig) => {
    if (photoSections.length <= 1) {
      setSectionError('Debe haber al menos una sección de fotos en el Paso 3.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '¿Estás seguro de borrar este elemento?',
      itemType: 'Sección de Fotos (Paso 3)',
      itemName: section.title,
      message: section.isStandard
        ? 'Esta es una sección estándar de auditoría. Se eliminará del flujo y de Supabase, pero podrás recuperarla usando el botón de restablecer.'
        : 'Esta sección personalizada y su slot de evidencia serán eliminados permanentemente del flujo del Paso 3 y de Supabase.',
      confirmText: 'Sí, borrar sección',
      onConfirm: () => {
        const updated = photoSections.filter((sec) => sec.id !== section.id);
        setPhotoSections(updated);
        saveStoredPhotoSections(updated);
        deletePhotoSectionFromSupabase(section.id);
        if (editingSectionId === section.id) {
          setEditingSectionId(null);
        }
        showNotification(`✓ Sección "${section.title}" eliminada de Supabase`);
      },
    });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photoSections.length) return;

    const updated = [...photoSections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setPhotoSections(updated);
    saveStoredPhotoSections(updated);

    // Actualizar orden en Supabase
    savePhotoSectionToSupabase(updated[index], index + 1);
    savePhotoSectionToSupabase(updated[targetIndex], targetIndex + 1);
  };

  const handleResetPhotoSections = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Restablecer secciones a las 4 originales?',
      itemName: 'Secciones del Paso 3',
      message: '¿Deseas restablecer las secciones de fotos a las 4 originales predeterminadas (Pieza Inicial, Proceso, Empaque y Tarima)?',
      confirmText: 'Sí, restablecer secciones',
      onConfirm: () => {
        const resetSections = resetStoredPhotoSections();
        setPhotoSections(resetSections);
        seedDefaultPhotoSectionsToSupabase();
        setIsCreatingSection(false);
        setEditingSectionId(null);
        showNotification('✓ Secciones de fotos restablecidas a las 4 originales en Supabase');
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO DEL MODAL */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl text-slate-950 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                  Configuración del Sistema de Calidad
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                  Menú Secreto
                </span>
                <span
                  className={`inline-flex items-center space-x-1 text-[9.5px] px-2 py-0.5 rounded-full font-mono border ${
                    cloudSyncStatus === 'synced'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Estado de sincronización con la base de datos Supabase"
                >
                  <Database className="w-2.5 h-2.5" />
                  <span>
                    {cloudSyncStatus === 'synced'
                      ? 'Supabase DB'
                      : cloudSyncStatus === 'syncing'
                      ? 'Sincronizando...'
                      : 'Supabase Listo'}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gestiona inspectores autorizados y secciones de fotos del Paso 3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICACIÓN TOAST LOCAL */}
        {notification && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in">
            {notification}
          </div>
        )}

        {/* BARRA DE PESTAÑAS */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('inspectors');
              setInspectorError(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition border-b-2 ${
              activeTab === 'inspectors'
                ? 'bg-white border-amber-500 text-neutral-900 shadow-xs'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Inspectores de Calidad</span>
            <span className="bg-neutral-200 text-neutral-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {inspectors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('photos');
              setSectionError(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition border-b-2 ${
              activeTab === 'photos'
                ? 'bg-white border-amber-500 text-neutral-900 shadow-xs'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Secciones de Fotos (Paso 3)</span>
            <span className="bg-neutral-200 text-neutral-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {photoSections.length}
            </span>
          </button>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ======================================================== */}
          {/* PESTAÑA 1: INSPECTORES DE CALIDAD                        */}
          {/* ======================================================== */}
          {activeTab === 'inspectors' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <div className="flex items-start space-x-2 text-amber-900 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Aquí puedes <strong>ingresar</strong>, <strong>modificar</strong> y <strong>borrar</strong> los nombres de los inspectores de calidad. Estos nombres alimentan automáticamente la lista desplegable en el <strong>Paso 1 (Datos del Lote)</strong> y la firma oficial del dictamen.
                  </p>
                </div>
              </div>

              {/* Formulario para ingresar nuevo inspector */}
              <form onSubmit={handleAddInspector} className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-2xl space-y-2">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                  + Ingresar Nuevo Inspector de Calidad
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInspectorName}
                    onChange={(e) => {
                      setNewInspectorName(e.target.value);
                      if (inspectorError) setInspectorError(null);
                    }}
                    placeholder="Ej. Ing. María Guadalupe Gómez (Calidad)"
                    className="flex-1 bg-white border-2 border-neutral-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 placeholder:text-neutral-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-900 hover:bg-black active:scale-95 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Agregar</span>
                  </button>
                </div>
                {inspectorError && (
                  <p className="text-xs text-red-600 font-bold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inspectorError}</span>
                  </p>
                )}
              </form>

              {/* Lista de inspectores actuales */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-neutral-700 uppercase tracking-wider">
                    Inspectores Registrados ({inspectors.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetInspectors}
                    className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 flex items-center space-x-1 transition underline decoration-dotted"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer lista predeterminada</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {inspectors.map((inspector, index) => {
                    const isEditing = editingInspectorIndex === index;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isEditing
                            ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-200'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingInspectorValue}
                              onChange={(e) => setEditingInspectorValue(e.target.value)}
                              className="flex-1 bg-white border-2 border-neutral-900 rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditInspector(index);
                                if (e.key === 'Escape') setEditingInspectorIndex(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditInspector(index)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                              title="Guardar cambios"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingInspectorIndex(null)}
                              className="p-1.5 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition"
                              title="Cancelar edición"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-200">
                                {index + 1}
                              </span>
                              <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                                👤 {inspector}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditInspector(index)}
                                className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Modificar nombre"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInspector(index)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Borrar inspector"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: SECCIONES DE FOTOS (PASO 3)                   */}
          {/* ======================================================== */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <div className="flex items-start space-x-2 text-emerald-950 text-xs">
                  <Camera className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p>
                    Administra las secciones del <strong>Paso 3 (Evidencias Fotográficas)</strong>. Puedes <strong>crear nuevas secciones</strong> (ej. pesaje, etiquetado especial), <strong>modificar</strong> títulos y guías, marcar cuáles son <strong>obligatorias</strong> para poder avanzar al Paso 4, o <strong>eliminar</strong> las que no apliquen a tu proceso.
                  </p>
                </div>
              </div>

              {/* Botón para crear nueva sección si no hay formulario abierto */}
              {!isCreatingSection && !editingSectionId && (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateSection}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-black active:scale-95 text-white font-black text-xs rounded-xl flex items-center space-x-2 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>+ Nueva Sección de Fotos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPhotoSections}
                    className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 flex items-center space-x-1 transition underline decoration-dotted"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer 4 originales</span>
                  </button>
                </div>
              )}

              {/* Formulario de creación / edición de sección */}
              {(isCreatingSection || editingSectionId) && (
                <div className="bg-neutral-50 border-2 border-emerald-400 p-4 rounded-2xl space-y-3.5 shadow-sm animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <h4 className="font-black text-xs sm:text-sm text-neutral-900 flex items-center space-x-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>
                        {isCreatingSection ? 'Crear Nueva Sección de Fotos' : 'Modificar Sección de Fotos'}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleCancelSectionForm}
                      className="text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {sectionError && (
                    <p className="text-xs text-red-600 font-bold flex items-center space-x-1 bg-red-50 p-2 rounded-lg border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{sectionError}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Selector de Icono Emoji */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-700 uppercase mb-1">
                        Icono
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl p-1 bg-white border border-neutral-300 rounded-xl flex items-center justify-center w-11 h-11 shrink-0">
                          {sectionIcon}
                        </span>
                        <select
                          value={sectionIcon}
                          onChange={(e) => setSectionIcon(e.target.value)}
                          className="w-full bg-white border border-neutral-300 rounded-xl px-2 py-2 text-xs font-bold"
                        >
                          {COMMON_EMOJIS.map((emoji) => (
                            <option key={emoji} value={emoji}>
                              {emoji}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Título de la sección */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-black text-neutral-700 uppercase mb-1">
                        Título de la Sección <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={sectionTitle}
                        onChange={(e) => setSectionTitle(e.target.value)}
                        placeholder="Ej. 5. Registro de Pesaje en Báscula"
                        className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-neutral-900 focus:outline-neutral-900"
                      />
                    </div>
                  </div>

                  {/* Subtítulo */}
                  <div>
                    <label className="block text-[11px] font-black text-neutral-700 uppercase mb-1">
                      Subtítulo / Referencia Rápida
                    </label>
                    <input
                      type="text"
                      value={sectionSubtitle}
                      onChange={(e) => setSectionSubtitle(e.target.value)}
                      placeholder="Ej. Tara y peso neto en display digital"
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-neutral-900"
                    />
                  </div>

                  {/* Guía explicativa */}
                  <div>
                    <label className="block text-[11px] font-black text-neutral-700 uppercase mb-1">
                      Guía / Instrucción para el Inspector
                    </label>
                    <textarea
                      value={sectionGuide}
                      onChange={(e) => setSectionGuide(e.target.value)}
                      rows={2}
                      placeholder="Ej. Toma foto clara y legible del display de la báscula mostrando el peso exacto."
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-neutral-900"
                    />
                  </div>

                  {/* Checkbox Obligatoria */}
                  <div className="flex items-center space-x-2 pt-1">
                    <label className="relative flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sectionRequired}
                        onChange={(e) => setSectionRequired(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded-md border-neutral-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="ml-2 text-xs font-bold text-neutral-800">
                        {sectionRequired ? (
                          <span className="text-emerald-700 flex items-center space-x-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Obligatoria (Bloquea el avance al Paso 4 si no tiene fotos)</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 flex items-center space-x-1">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Opcional (Permite fotos pero no bloquea el avance si está vacía)</span>
                          </span>
                        )}
                      </span>
                    </label>
                  </div>

                  {/* Botones de acción del formulario */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={handleCancelSectionForm}
                      className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSection}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center space-x-1.5 transition shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isCreatingSection ? 'Guardar Sección' : 'Actualizar Sección'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de secciones activas */}
              <div className="space-y-3">
                <h4 className="font-black text-xs text-neutral-700 uppercase tracking-wider">
                  Secciones Activas en el Paso 3 ({photoSections.length})
                </h4>

                <div className="space-y-2.5">
                  {photoSections.map((sec, index) => (
                    <div
                      key={sec.id}
                      className="bg-white border-2 border-neutral-200 hover:border-neutral-300 p-3.5 rounded-2xl transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <span className="text-2xl p-1 bg-neutral-50 border border-neutral-200 rounded-xl shrink-0">
                          {sec.icon || '📸'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h5 className="font-black text-xs sm:text-sm text-neutral-900 leading-tight">
                              {sec.title}
                            </h5>
                            {sec.required ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Obligatoria</span>
                              </span>
                            ) : (
                              <span className="bg-neutral-100 text-neutral-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 flex items-center space-x-1">
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Opcional</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                            {sec.subtitle}
                          </p>
                          <p className="text-[11px] text-neutral-600 mt-1 bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 leading-snug">
                            💡 {sec.guide}
                          </p>
                        </div>
                      </div>

                      {/* Botones de acción de la sección */}
                      <div className="flex items-center justify-end space-x-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        {/* Reordenar */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveSection(index, 'up')}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-100 transition"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === photoSections.length - 1}
                          onClick={() => handleMoveSection(index, 'down')}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-100 transition"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleStartEditSection(sec)}
                          className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Modificar sección"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Borrar */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar sección"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA DEL MODAL */}
        <div className="bg-neutral-100 px-5 py-3 border-t border-neutral-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-500 font-medium">
            Los cambios se guardan y sincronizan automáticamente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-black rounded-xl transition shadow-xs active:scale-95"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación para borrar */}
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
