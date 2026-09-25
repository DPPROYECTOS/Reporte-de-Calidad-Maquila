import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenLine, Lock, ShieldCheck, Camera } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  signerName: string;
  onSignerNameChange: (name: string) => void;
  signatureDataUrl?: string;
  onSaveSignature: (dataUrl: string) => void;
  onClearSignature: () => void;
  placeholderName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  signerName,
  onSignerNameChange,
  signatureDataUrl,
  onSaveSignature,
  onClearSignature,
  placeholderName = 'Nombre de quien firma',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(Boolean(signatureDataUrl));
  const [isCaptured, setIsCaptured] = useState(Boolean(signatureDataUrl));

  // Renderizar la firma guardada cuando exista
  const renderSignature = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      setHasStrokes(true);
      setIsCaptured(true);
    };
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : (canvas.parentElement?.clientWidth || 320);
      const height = rect.height > 0 ? rect.height : 192;
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // slate-900
      ctx.lineWidth = 2.5;

      if (signatureDataUrl) {
        renderSignature(signatureDataUrl);
      } else {
        ctx.clearRect(0, 0, width, height);
        setHasStrokes(false);
        setIsCaptured(false);
      }
    };

    setupCanvas();

    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [signatureDataUrl, renderSignature]);

  const getCoordinates = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (isCaptured) return; // Bloqueado contra modificaciones
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isCaptured) return;
    // Prevenir scroll en pantallas táctiles mientras se firma
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || isCaptured) return;
    setIsDrawing(false);
  };

  // Captura y bloquea la firma definitivamente
  const handleCaptureSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setIsCaptured(true);
    onSaveSignature(dataUrl);
  };

  // Desbloquea y limpia el lienzo para volver a firmar
  const handleRetrySignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasStrokes(false);
    setIsCaptured(false);
    onClearSignature();
  };

  return (
    <div
      className={`p-3.5 rounded-2xl border-2 transition-all space-y-2.5 ${
        isCaptured
          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
          : hasStrokes
          ? 'bg-amber-50/30 border-amber-300'
          : 'bg-neutral-50 border-neutral-300'
      }`}
    >
      {/* Encabezado y Estado de la Firma */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider flex items-center space-x-1.5 min-w-0 flex-1">
          <PenLine className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
          <span className="truncate">{label}</span>
        </label>

        {isCaptured ? (
          <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-300 shrink-0 whitespace-nowrap">
            <Lock className="w-2.5 h-2.5 text-emerald-700" />
            <span>Firmado</span>
          </span>
        ) : hasStrokes ? (
          <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 border border-amber-300 shrink-0 animate-pulse whitespace-nowrap">
            <Camera className="w-2.5 h-2.5 text-amber-700" />
            <span>Capturar</span>
          </span>
        ) : null}
      </div>

      {/* Input Nombre del Firmante */}
      <div>
        <input
          type="text"
          value={signerName}
          onChange={(e) => onSignerNameChange(e.target.value)}
          placeholder={placeholderName}
          className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-neutral-900"
        />
      </div>

      {/* Canvas Táctil para el Dedo con Bloqueo Visual */}
      <div
        className={`relative rounded-xl border-2 overflow-hidden touch-none transition-all ${
          isCaptured
            ? 'border-solid border-emerald-500 bg-white cursor-not-allowed shadow-2xs'
            : hasStrokes
            ? 'border-dashed border-amber-400 bg-white'
            : 'border-dashed border-neutral-300 bg-white'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full max-w-full h-48 bg-white block ${
            isCaptured ? 'pointer-events-none opacity-90' : 'cursor-crosshair'
          }`}
        />

        {!hasStrokes && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 text-xs font-bold uppercase tracking-wider select-none">
            ✍️ Firma aquí con tu dedo
          </div>
        )}

        {isCaptured && (
          <div className="absolute top-2 right-2 pointer-events-none bg-emerald-600/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-xs">
            <Lock className="w-2.5 h-2.5" />
            <span>Firma Protegida</span>
          </div>
        )}
      </div>

      {/* Barra de Acciones de Firma: Capturar y Reintentar */}
      {isCaptured ? (
        /* Estado 1: Firma Ya Capturada (Bloqueada) */
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Firma asegurada, no modificable</span>
          </div>

          <button
            type="button"
            onClick={handleRetrySignature}
            className="px-2.5 py-1.5 text-[11px] font-bold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 active:scale-95 rounded-lg flex items-center space-x-1.5 transition shadow-2xs cursor-pointer shrink-0"
            title="Borrar firma actual y desbloquear para firmar de nuevo"
          >
            <RotateCcw className="w-3 h-3 text-neutral-600" />
            <span>Reintentar firma</span>
          </button>
        </div>
      ) : hasStrokes ? (
        /* Estado 2: Trazo Realizado (Esperando confirmación / captura) */
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleRetrySignature}
            className="px-2.5 py-1.5 text-[11px] font-bold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 active:scale-95 rounded-lg flex items-center space-x-1 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-neutral-500" />
            <span>Reintentar firma</span>
          </button>

          <button
            type="button"
            onClick={handleCaptureSignature}
            className="px-3.5 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Capturar Firma</span>
          </button>
        </div>
      ) : (
        /* Estado 3: Sin Firma Aún */
        <div className="text-[11px] text-neutral-500 px-0.5 flex items-center justify-between">
          <span>Traza tu firma en el recuadro para habilitar la captura.</span>
        </div>
      )}
    </div>
  );
};
