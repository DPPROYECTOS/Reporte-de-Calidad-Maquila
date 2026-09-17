import React, { useRef, useState, useEffect } from 'react';
import { QualityReport, PhotoEvidenceCategory } from '../../types/qualityReport';
import { compressImage, uploadPhotoToStorage } from '../../utils/imageCompressor';
import {
  PhotoSectionConfig,
  getStoredPhotoSections,
  getSectionPhotoSlot,
  updateReportWithPhotoSlot,
  syncPhotoSectionsFromSupabase,
} from '../../utils/appConfigStore';
import { 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  Plus,
  Lock,
  Layers
} from 'lucide-react';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface MobileStep3PhotosProps {
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const MobileStep3Photos: React.FC<MobileStep3PhotosProps> = ({
  report,
  onUpdateReport,
  onNextStep,
  onPrevStep,
}) => {
  const [photoSections, setPhotoSections] = useState<PhotoSectionConfig[]>(() => getStoredPhotoSections());

  useEffect(() => {
    // Sincronizar secciones con Supabase
    syncPhotoSectionsFromSupabase().then((res) => {
      if (res.fromCloud && res.data.length > 0) {
        setPhotoSections(res.data);
      }
    });

    const handleSectionsUpdate = (e: CustomEvent<PhotoSectionConfig[]>) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPhotoSections(e.detail);
      } else {
        setPhotoSections(getStoredPhotoSections());
      }
    };
    window.addEventListener('quality-photo-sections-updated', handleSectionsUpdate as EventListener);
    return () => {
      window.removeEventListener('quality-photo-sections-updated', handleSectionsUpdate as EventListener);
    };
  }, []);

  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{ title: string; url: string; index: number; total: number } | null>(null);

  // Modal de confirmación para borrar fotos
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
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

  // File input refs dynamic map
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Helper to safely extract all photos in a slot
  const getSlotPhotos = (slot?: PhotoEvidenceCategory): string[] => {
    if (!slot) return [];
    if (slot.urls && Array.isArray(slot.urls) && slot.urls.length > 0) return slot.urls;
    if (slot.captured && slot.url) return [slot.url];
    return [];
  };

  // Capture or upload multiple images
  const handlePhotoCapture = async (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentSlot = getSectionPhotoSlot(report, key);
    const currentUrls = getSlotPhotos(currentSlot);

    const fileArray: File[] = Array.from(files);

    try {
      // 1. Comprimir estrictamente a < 0.5MB (500KB)
      const compressedPhotos = await Promise.all(
        fileArray.map((file) => compressImage(file))
      );
      const validCompressed = compressedPhotos.filter((p) => Boolean(p));

      // 2. Subir a Supabase Storage bucket 'inspection-photos'
      const folderPath = `inspections/${report.folioOT || 'ot'}/${key}`;
      const uploadResults = await Promise.all(
        validCompressed.map((dataUrl) => uploadPhotoToStorage(dataUrl, folderPath))
      );
      const validPhotos = uploadResults.map((r) => r.url);
      const combinedUrls = [...currentUrls, ...validPhotos];

      const updated = updateReportWithPhotoSlot(report, key, {
        ...currentSlot,
        captured: combinedUrls.length > 0,
        url: combinedUrls[0], // primary thumbnail
        urls: combinedUrls, // list of all photos
        note: currentSlot.note || `${combinedUrls.length} foto(s) capturadas`,
      });
      onUpdateReport(updated);
    } catch (err) {
      console.warn('Error al procesar y comprimir imágenes:', err);
    }

    // Reset input value so same files can be re-selected if desired
    e.target.value = '';
  };

  // Delete a single photo from a category
  const handleRemoveSinglePhoto = (
    key: string,
    indexToRemove: number
  ) => {
    const currentSlot = getSectionPhotoSlot(report, key);
    const currentUrls = getSlotPhotos(currentSlot);
    const updatedUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);

    const updated = updateReportWithPhotoSlot(report, key, {
      ...currentSlot,
      captured: updatedUrls.length > 0,
      url: updatedUrls.length > 0 ? updatedUrls[0] : undefined,
      urls: updatedUrls,
      note: updatedUrls.length > 0 ? `${updatedUrls.length} foto(s) registradas` : '',
    });
    onUpdateReport(updated);
  };

  // Remove all photos from a slot
  const handleClearSlot = (key: string) => {
    const updated = updateReportWithPhotoSlot(report, key, {
      captured: false,
      url: undefined,
      urls: [],
      note: '',
    });
    onUpdateReport(updated);
  };

  const handleUpdateNote = (
    key: string,
    note: string
  ) => {
    const currentSlot = getSectionPhotoSlot(report, key);
    const updated = updateReportWithPhotoSlot(report, key, {
      ...currentSlot,
      note,
    });
    onUpdateReport(updated);
  };

  // Stats calculation
  const requiredSections = photoSections.filter((s) => s.required !== false);
  const totalRequiredCount = requiredSections.length;

  const completedRequiredCount = requiredSections.filter((s) => {
    const slot = getSectionPhotoSlot(report, s.key);
    return getSlotPhotos(slot).length > 0;
  }).length;

  const totalPhotosCount = photoSections.reduce((acc, s) => {
    const slot = getSectionPhotoSlot(report, s.key);
    return acc + getSlotPhotos(slot).length;
  }, 0);

  const allSlotsCompleted = totalRequiredCount === 0 || completedRequiredCount === totalRequiredCount;
  const missingRequiredCount = Math.max(0, totalRequiredCount - completedRequiredCount);

  return (
    <div className="space-y-4 pb-32 sm:pb-28">
      {/* 1. BANNER SUPERIOR CON INDICADOR DE PROGRESO */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white p-4 rounded-2xl shadow-sm border border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Camera className="w-4 h-4" />
            <span>Paso 3 de 4 • Evidencias Fotográficas</span>
          </div>

          <div
            className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-black border flex items-center space-x-1 ${
              allSlotsCompleted
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-amber-400 text-neutral-950 border-amber-300'
            }`}
          >
            <span>{completedRequiredCount} de {totalRequiredCount} Apartados Obligatorios</span>
            <span className="opacity-70">({totalPhotosCount} fotos)</span>
          </div>
        </div>

        <h2 className="text-lg font-black text-white leading-tight mt-1.5">
          Toma las Fotos del Lote
        </h2>
        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
          Puedes subir <strong>más de una foto por apartado</strong> (múltiples ángulos o detalles). Cada apartado obligatorio debe tener al menos una evidencia fotográfica para poder avanzar.
        </p>

        {/* Barra de progreso de apartados */}
        <div className="w-full bg-neutral-800 h-2.5 rounded-full mt-3 overflow-hidden border border-neutral-700">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              allSlotsCompleted ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            style={{ width: `${totalRequiredCount > 0 ? (completedRequiredCount / totalRequiredCount) * 100 : 100}%` }}
          />
        </div>
      </div>

      {/* 2. TARJETAS DE LOS APARTADOS (CON SOPORTE DINÁMICO Y MULTIFOTO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {photoSections.map((slot) => {
          const slotData = getSectionPhotoSlot(report, slot.key);
          const photos = getSlotPhotos(slotData);
          const hasPhotos = photos.length > 0;
          const slotNote = slotData.note || '';

          return (
            <div
              key={slot.key}
              className={`p-4 rounded-2xl border-2 transition shadow-xs ${
                hasPhotos
                  ? 'bg-white border-emerald-400 shadow-xs'
                  : 'bg-white border-neutral-300 hover:border-neutral-400'
              }`}
            >
              {/* Input oculto compatible con cámara y selección múltiple */}
              <input
                ref={(el) => {
                  fileInputRefs.current[slot.key] = el;
                }}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotoCapture(slot.key, e)}
                className="hidden"
              />

              {/* Encabezado del apartado */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl shrink-0">{slot.icon || '📸'}</span>
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <h4 className="font-black text-sm text-neutral-900 leading-none">
                        {slot.title}
                      </h4>
                      {hasPhotos ? (
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-300 font-mono">
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</span>
                        </span>
                      ) : slot.required !== false ? (
                        <span className="bg-amber-100 text-amber-900 font-bold text-[9px] px-2 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>0 fotos • Obligatoria</span>
                        </span>
                      ) : (
                        <span className="bg-neutral-100 text-neutral-600 font-bold text-[9px] px-2 py-0.5 rounded-full border border-neutral-300">
                          0 fotos • Opcional
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                      {slot.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {slot.guide && (
                <p className="text-xs text-neutral-600 mt-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 leading-snug">
                  💡 {slot.guide}
                </p>
              )}

              {/* GALERÍA DE FOTOS SI YA TIENE EVIDENCIAS */}
              {hasPhotos && (
                <div className="mt-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                      Evidencias registradas ({photos.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmModal({
                          isOpen: true,
                          title: '¿Estás seguro de borrar todas las fotos?',
                          itemType: 'Sección',
                          itemName: slot.title,
                          message: `Se eliminarán todas las ${photos.length} fotos cargadas en "${slot.title}". Esta acción vaciará el apartado fotográfico.`,
                          confirmText: 'Sí, borrar todas',
                          onConfirm: () => handleClearSlot(slot.key),
                        });
                      }}
                      className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Borrar todas</span>
                    </button>
                  </div>

                  {/* Cuadrícula de miniaturas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {photos.map((photoUrl, pIndex) => (
                      <div
                        key={pIndex}
                        className="relative rounded-xl overflow-hidden border-2 border-emerald-300 bg-neutral-950 aspect-square group shadow-xs"
                      >
                        <img
                          src={photoUrl}
                          alt={`${slot.title} - Foto ${pIndex + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-300"
                          onClick={() => setSelectedPhotoPreview({ 
                            title: `${slot.title} (Foto ${pIndex + 1} de ${photos.length})`, 
                            url: photoUrl,
                            index: pIndex + 1,
                            total: photos.length 
                          })}
                        />

                        {/* Indicador de número de foto */}
                        <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                          #{pIndex + 1}
                        </div>

                        {/* Botón de ver en grande */}
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoPreview({ 
                            title: `${slot.title} (Foto ${pIndex + 1} de ${photos.length})`, 
                            url: photoUrl,
                            index: pIndex + 1,
                            total: photos.length 
                          })}
                          className="absolute bottom-1.5 left-1.5 bg-black/70 hover:bg-black/90 text-white text-[9px] font-bold px-1.5 py-1 rounded-md flex items-center space-x-1 transition"
                          title="Ampliar foto"
                        >
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>Ver</span>
                        </button>

                        {/* Botón de borrar foto individual */}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmModal({
                              isOpen: true,
                              title: '¿Estás seguro de borrar esta foto?',
                              itemType: 'Evidencia',
                              itemName: `${slot.title} (Foto #${pIndex + 1})`,
                              message: 'Esta fotografía será removida de las evidencias de inspección de la orden de trabajo.',
                              confirmText: 'Sí, borrar foto',
                              onConfirm: () => handleRemoveSinglePhoto(slot.key, pIndex),
                            });
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 active:scale-90 text-white p-1 rounded-md transition shadow-sm cursor-pointer"
                          title="Eliminar esta foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Tarjeta interactiva "+ Agregar otra foto" dentro de la cuadrícula */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[slot.key]?.click()}
                      className="rounded-xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 active:scale-95 bg-emerald-50/50 hover:bg-emerald-50 transition aspect-square flex flex-col items-center justify-center text-emerald-800 p-2 space-y-1"
                    >
                      <Plus className="w-6 h-6 text-emerald-700" />
                      <span className="text-[10px] font-black uppercase text-center leading-tight">
                        + Agregar Otra Foto
                      </span>
                    </button>
                  </div>

                  {/* Campo de notas opcional */}
                  <div className="pt-1">
                    <input
                      type="text"
                      defaultValue={slotNote}
                      onBlur={(e) => handleUpdateNote(slot.key, e.target.value)}
                      placeholder="Nota opcional para este apartado (ej. Muestra aprobada en mesa 2)"
                      className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-emerald-600 font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Si NO TIENE FOTOS: Botón principal de apertura de cámara */}
              {!hasPhotos && (
                <div className="mt-3.5">
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[slot.key]?.click()}
                    className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-xs border-2 border-neutral-900"
                  >
                    <Camera className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Tomar o Subir Fotos de este Apartado</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. AVISO DE CANDADO POKA-YOKE SI FALTAN APARTADOS */}
      {!allSlotsCompleted && (
        <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl flex items-start space-x-2.5 text-amber-900">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Candado Poka-Yoke Paso 3:</span> Faltan <strong>{missingRequiredCount} apartado(s) obligatorio(s)</strong> con fotos. Debes tener al menos 1 fotografía en cada apartado obligatorio para desbloquear el Dictamen y Firma Final.
          </div>
        </div>
      )}

      {/* 4. MODAL PARA VER FOTO COMPLETA EN PANTALLA GRANDE */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm p-4 flex flex-col items-center justify-center"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div 
            className="w-full max-w-lg bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-neutral-950 flex items-center justify-between border-b border-neutral-800 text-white">
              <span className="font-bold text-xs text-amber-400">
                {selectedPhotoPreview.title}
              </span>
              <button 
                onClick={() => setSelectedPhotoPreview(null)}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-md text-white font-bold transition"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[250px]">
              <img
                src={selectedPhotoPreview.url}
                alt={selectedPhotoPreview.title}
                className="max-h-[72vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. BOTÓN FLOTANTE INFERIOR CON CANDADO POKA-YOKE */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-40 shadow-lg">
        <div className="max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onPrevStep}
              className="w-12 py-3 sm:py-3.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-black rounded-xl border border-neutral-300 flex items-center justify-center transition shrink-0 cursor-pointer"
              title="Volver al Paso 2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {allSlotsCompleted ? (
              <button
                type="button"
                onClick={onNextStep}
                className="flex-1 py-3 sm:py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md cursor-pointer"
              >
                <span>✓ Paso 4: Dictamen y Firma Final ({totalPhotosCount} fotos)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={true}
                className="flex-1 py-3 sm:py-3.5 px-4 bg-neutral-200 text-neutral-500 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border border-neutral-300 cursor-not-allowed shadow-none"
              >
                <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>🔒 Paso 4 Bloqueado: Falta tomar fotos</span>
              </button>
            )}
          </div>

          {!allSlotsCompleted && (
            <p className="text-center text-[10px] text-amber-700 font-bold mt-1">
              Faltan {missingRequiredCount} apartado(s) obligatorio(s) con fotos para avanzar al Dictamen Final
            </p>
          )}
        </div>
      </div>

      {/* Ventana de confirmación de borrado */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmModal.onConfirm}
        title={deleteConfirmModal.title}
        itemName={deleteConfirmModal.itemName}
        itemType={deleteConfirmModal.itemType}
        message={deleteConfirmModal.message}
        confirmText={deleteConfirmModal.confirmText}
      />
    </div>
  );
};
