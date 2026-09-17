import React, { useState } from 'react';
import { X, Camera, Check, Upload, Image as ImageIcon, Archive, Download, FileArchive, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { QualityReport } from '../types/qualityReport';
import { compressImage, uploadPhotoToStorage } from '../utils/imageCompressor';
import { exportInspectionPackageZip } from '../utils/excelExport';

interface PhotoEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport;
  onUpdateReport: (updated: QualityReport) => void;
}

export const PhotoEvidenceModal: React.FC<PhotoEvidenceModalProps> = ({
  isOpen,
  onClose,
  report,
  onUpdateReport,
}) => {
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipStatusMsg, setZipStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTogglePhoto = (
    key: 'photoInitial' | 'photoProcess' | 'photoReleasedPiece' | 'photoPalletized',
    noteValue?: string
  ) => {
    const current = report[key];
    const updated = {
      ...report,
      [key]: {
        ...current,
        captured: !current.captured,
        note: noteValue !== undefined ? noteValue : current.note,
      },
    };
    onUpdateReport(updated);
  };

  const handleUpdateNote = (
    key: 'photoInitial' | 'photoProcess' | 'photoReleasedPiece' | 'photoPalletized',
    noteValue: string
  ) => {
    const updated = {
      ...report,
      [key]: {
        ...report[key],
        note: noteValue,
      },
    };
    onUpdateReport(updated);
  };

  // Upload individual file / image
  const handleSingleImageUpload = async (
    key: 'photoInitial' | 'photoProcess' | 'photoReleasedPiece' | 'photoPalletized',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      if (!dataUrl) return;

      // Subir al bucket de Supabase Storage con límite < 0.5MB
      const folder = `inspections/${report.folioOT || 'ot'}/${key}`;
      const uploadResult = await uploadPhotoToStorage(dataUrl, folder);
      const photoUrl = uploadResult.url;

      const currentSlot = report[key] || { captured: false, urls: [], note: '' };
      const currentUrls = currentSlot.urls || (currentSlot.url ? [currentSlot.url] : []);
      const newUrls = [...currentUrls, photoUrl];

      onUpdateReport({
        ...report,
        [key]: {
          ...currentSlot,
          captured: true,
          url: newUrls[0],
          urls: newUrls,
          note: currentSlot.note || `Archivo: ${file.name}`,
        },
      });
    } catch (err) {
      console.warn('Error al procesar y comprimir imagen:', err);
    }
  };

  // Real ZIP File Processing with JSZip
  const handleZipFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingZip(true);
    setZipStatusMsg('Leyendo archivo .zip y extrayendo imágenes...');

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const imageKeys: Array<'photoInitial' | 'photoProcess' | 'photoReleasedPiece' | 'photoPalletized'> = [
        'photoInitial',
        'photoProcess',
        'photoReleasedPiece',
        'photoPalletized',
      ];

      const extractedPhotos: string[] = [];

      const entries = Object.keys(zipContent.files);
      for (const filename of entries) {
        const zipObj = zipContent.files[filename];
        if (zipObj.dir) continue;
        const lower = filename.toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
          const base64 = await zipObj.async('base64');
          const mime = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const rawDataUrl = `data:${mime};base64,${base64}`;
          const compressed = await compressImage(rawDataUrl);
          extractedPhotos.push(compressed);
        }
      }

      if (extractedPhotos.length === 0) {
        setZipStatusMsg('El archivo ZIP fue cargado correctamente. Se adjuntó como soporte del expediente.');
      } else {
        setZipStatusMsg(`¡Se extrajeron ${extractedPhotos.length} imágenes exitosamente del paquete ZIP!`);
      }

      // Assign extracted photos to slots
      let updatedReport = { ...report };
      imageKeys.forEach((key, idx) => {
        if (extractedPhotos[idx]) {
          updatedReport[key] = {
            captured: true,
            url: extractedPhotos[idx],
            note: updatedReport[key].note || `Extraída de ${file.name}`,
          };
        }
      });

      // Save ZIP metadata
      updatedReport.zipAttachment = {
        filename: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        filesCount: extractedPhotos.length,
      };

      onUpdateReport(updatedReport);
    } catch (err) {
      console.error(err);
      setZipStatusMsg('Error al procesar el archivo ZIP. Asegúrese de que sea un archivo .zip válido.');
    } finally {
      setIsProcessingZip(false);
    }
  };

  // Download all photos and full package as a .ZIP file
  const handleDownloadZip = async () => {
    setIsProcessingZip(true);
    try {
      await exportInspectionPackageZip(report);
    } catch (err) {
      console.error('Error al descargar ZIP:', err);
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleMockUpload = (
    key: 'photoInitial' | 'photoProcess' | 'photoReleasedPiece' | 'photoPalletized'
  ) => {
    const mockUrls: Record<string, string> = {
      photoInitial: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
      photoProcess: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
      photoReleasedPiece: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
      photoPalletized: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
    };

    onUpdateReport({
      ...report,
      [key]: {
        ...report[key],
        captured: true,
        url: mockUrls[key],
      },
    });
  };

  const photosList = [
    {
      key: 'photoInitial' as const,
      num: 1,
      title: '1. Foto de Inicio (Estado Inicial de Almacén F)',
      desc: 'Evidencia gráfica del estado del producto recibido de almacén antes de ingresar al módulo de maquila.',
      data: report.photoInitial,
    },
    {
      key: 'photoProcess' as const,
      num: 2,
      title: '2. Foto de Proceso (Ejecución en Módulo de Maquila)',
      desc: 'Muestra de cómo se realiza el armado, etiquetado o empaque dentro del módulo de trabajo asignado.',
      data: report.photoProcess,
    },
    {
      key: 'photoReleasedPiece' as const,
      num: 3,
      title: '3. Foto de Pieza Liberada (Cumplimiento de Criterios)',
      desc: 'Detalle cercano del producto armado final verificado contra las especificaciones del manual CVD-AMA-M-01.',
      data: report.photoReleasedPiece,
    },
    {
      key: 'photoPalletized' as const,
      num: 4,
      title: '4. Foto de Producto Terminado Entarimado (Con CVD-AMA-F-03)',
      desc: 'Tarima final con patrón de estiba autorizado y la hoja de identificación de producto armado visible.',
      data: report.photoPalletized,
    },
  ];

  const totalCaptured = photosList.filter((p) => p.data.captured).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden no-print font-sans">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-300 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header - Fixed */}
        <div className="flex-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-md shadow-amber-500/20 shrink-0 ring-1 ring-amber-300/40">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-black text-xs sm:text-sm text-white tracking-wide break-words">
                  Evidencia Fotográfica y Paquetes .ZIP
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0">
                  {totalCaptured}/4 CAPTURADAS
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 flex-wrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">Punto 6.2 CVD-AMA-PR-01</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">4 Fotos Obligatorias de Maquila</span>
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

        {/* ZIP Upload Bar - Fixed */}
        <div className="flex-none p-3 sm:p-4 bg-amber-50/70 border-b border-neutral-200 text-xs font-sans space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center space-x-2 text-[#1A1A1A]">
              <FileArchive className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="font-black uppercase tracking-wider text-[11px] block">Cargar Paquete de Evidencias (.ZIP)</span>
                <span className="text-[10px] text-neutral-600">Sube un archivo .zip para extraer e insertar las 4 fotos automáticamente.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-[#1A1A1A] hover:bg-neutral-800 text-white px-3 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center space-x-1.5 transition active:scale-98 shadow-xs">
                {isProcessingZip ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-300" />}
                <span>{isProcessingZip ? 'Procesando...' : 'Cargar .ZIP'}</span>
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleZipFileUpload}
                  className="hidden"
                  disabled={isProcessingZip}
                />
              </label>

              {totalCaptured > 0 && (
                <button
                  onClick={handleDownloadZip}
                  className="bg-white hover:bg-neutral-100 text-[#1A1A1A] border border-neutral-300 px-3 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center space-x-1.5 transition active:scale-98 shadow-xs"
                  title="Descargar paquete de evidencias como .ZIP"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Descargar .ZIP</span>
                </button>
              )}
            </div>
          </div>

          {/* Attached ZIP Banner */}
          {report.zipAttachment && (
            <div className="bg-white border border-neutral-300 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] font-mono mt-1 shadow-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <Archive className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="break-all">
                  <strong>Adjunto:</strong> {report.zipAttachment.filename} ({(report.zipAttachment.sizeBytes / 1024).toFixed(1)} KB)
                </span>
              </div>
              <span className="text-neutral-500 text-[10px] shrink-0 font-sans">
                {report.zipAttachment.filesCount} fotos • {report.zipAttachment.uploadedAt}
              </span>
            </div>
          )}

          {zipStatusMsg && (
            <div className="text-[11px] font-bold text-amber-900 bg-amber-100 p-2 rounded-lg border border-amber-300">
              {zipStatusMsg}
            </div>
          )}
        </div>

        {/* Progress bar - Fixed */}
        <div className="flex-none bg-white px-3.5 py-2 sm:px-6 sm:py-2.5 border-b border-neutral-200 flex items-center justify-between text-xs font-sans">
          <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[10px]">
            Avance: <span className="text-emerald-800 font-mono font-bold text-xs ml-1">{totalCaptured} / 4 fotos</span>
          </span>
          <div className="w-32 sm:w-48 bg-neutral-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalCaptured === 4 ? 'bg-emerald-600' : 'bg-[#1A1A1A]'
              }`}
              style={{ width: `${(totalCaptured / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* List of 4 mandatory photos - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 text-xs bg-[#FAF9F6]">
          {photosList.map((photo) => (
            <div
              key={photo.key}
              className={`border-2 rounded-2xl p-3.5 sm:p-4 transition shadow-xs ${
                photo.data.captured ? 'border-emerald-500 bg-emerald-50/40' : 'border-neutral-300 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-start space-x-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      photo.data.captured ? 'bg-emerald-700 text-white' : 'bg-neutral-800 text-white'
                    }`}
                  >
                    {photo.data.captured ? <Check className="w-4 h-4" /> : photo.num}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1A1A1A] leading-snug">{photo.title}</h4>
                    <p className="text-neutral-500 text-[11px] mt-0.5 leading-tight">{photo.desc}</p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 pt-1 sm:pt-0">
                  <label className="cursor-pointer flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-[#1A1A1A] font-bold border border-neutral-300 rounded-lg transition text-[10px] uppercase tracking-wider active:scale-95 shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSingleImageUpload(photo.key, e)}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => handleMockUpload(photo.key)}
                    className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold border border-neutral-300 rounded-lg transition text-[9px] uppercase tracking-wider active:scale-95"
                    title="Usar imagen de prueba"
                  >
                    Demo
                  </button>

                  <button
                    onClick={() => handleTogglePhoto(photo.key)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] rounded-lg transition border active:scale-95 ${
                      photo.data.captured
                        ? 'bg-emerald-800 text-white border-emerald-900 hover:bg-emerald-700'
                        : 'bg-[#1A1A1A] text-white border-[#1A1A1A] hover:bg-neutral-800'
                    }`}
                  >
                    {photo.data.captured ? '✓ Capturada' : '+ Marcar'}
                  </button>
                </div>
              </div>

              {/* Note / Image preview */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-200">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-neutral-700 uppercase tracking-wider mb-1">
                    Nota Técnica de la Foto #{photo.num}:
                  </label>
                  <input
                    type="text"
                    value={photo.data.note || ''}
                    onChange={(e) => handleUpdateNote(photo.key, e.target.value)}
                    placeholder="Ej. Foto tomada al inicio del turno en Módulo 1..."
                    className="w-full bg-[#FAF9F6] border-2 border-neutral-300 rounded-xl px-3 py-2 text-xs text-[#1A1A1A] focus:bg-white focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-700 uppercase tracking-wider mb-1">
                    Vista Previa:
                  </label>
                  {photo.data.url ? (
                    <div className="relative h-20 w-full overflow-hidden rounded-xl border border-neutral-300 group bg-black">
                      <img src={photo.data.url} alt={photo.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                        Cambiar
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-full border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 flex flex-col items-center justify-center text-neutral-400">
                      <ImageIcon className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] uppercase font-mono">Sin imagen</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer - Fixed */}
        <div className="flex-none bg-white border-t border-neutral-200 p-3 sm:px-6 sm:py-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 font-sans">
          <span className="text-[10px] text-neutral-500 italic text-center sm:text-left">
            * Se adjuntan al reporte de conformidad de calidad.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition text-center shadow-xs active:scale-98"
          >
            Guardar Evidencias
          </button>
        </div>
      </div>
    </div>
  );
};
