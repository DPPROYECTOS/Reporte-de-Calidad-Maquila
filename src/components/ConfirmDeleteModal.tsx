import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  dangerBadge?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro de borrar este elemento?',
  itemName,
  itemType,
  message,
  confirmText = 'Sí, borrar',
  cancelText = 'Cancelar',
  dangerBadge,
}) => {
  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con advertencia */}
        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border-b border-red-100 p-4 sm:p-5 flex items-start space-x-3.5">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 shadow-xs border border-red-200">
            <Trash2 className="w-6 h-6 text-red-600 animate-bounce-short" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full border border-red-200">
                {dangerBadge || 'Confirmación requerida'}
              </span>
            </div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug mt-1">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Mensaje */}
        <div className="p-5 sm:p-6 space-y-3.5 text-sm text-slate-600">
          {itemName && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-2.5">
              <span className="text-xs text-slate-400 font-bold uppercase shrink-0">
                {itemType || 'Elemento'}:
              </span>
              <span className="font-bold text-slate-800 break-words line-clamp-2">
                "{itemName}"
              </span>
            </div>
          )}

          <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
            {message || (
              <>
                Esta acción no se puede deshacer y el elemento se eliminará permanentemente
                de la lista y de los registros correspondientes.
              </>
            )}
          </p>

          <div className="flex items-center space-x-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Por favor, confirma que deseas continuar con el borrado.</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-bold text-xs sm:text-sm transition active:scale-95 shadow-xs cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs sm:text-sm transition active:scale-95 shadow-md shadow-red-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
