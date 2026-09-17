import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenLine } from 'lucide-react';

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
  const [hasDrawn, setHasDrawn] = useState(Boolean(signatureDataUrl));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 2.5;

    // If already has signature image, render it
    if (signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = signatureDataUrl;
    }
  }, []);

  const getCoordinates = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
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

  const startDrawing = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    // Prevent scrolling when drawing on touch screens
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
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onClearSignature();
  };

  return (
    <div className="bg-neutral-50 p-3.5 rounded-2xl border-2 border-neutral-300 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider flex items-center space-x-1.5">
          <PenLine className="w-3.5 h-3.5 text-neutral-600" />
          <span>{label}</span>
        </label>
        {hasDrawn && (
          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-300">
            <Check className="w-2.5 h-2.5" />
            <span>Firmado</span>
          </span>
        )}
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

      {/* Canvas Táctil para el Dedo */}
      <div className="relative bg-white rounded-xl border-2 border-dashed border-neutral-300 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-28 bg-white cursor-crosshair block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 text-xs font-bold uppercase tracking-wider">
            ✍️ Firma aquí con tu dedo
          </div>
        )}
      </div>

      {/* Botón limpiar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="px-2.5 py-1 text-[10px] font-bold text-neutral-500 hover:text-neutral-900 bg-neutral-200 hover:bg-neutral-300 rounded-lg flex items-center space-x-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Borrar y volver a firmar</span>
        </button>
      </div>
    </div>
  );
};
