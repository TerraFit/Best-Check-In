// src/components/checkin/SignaturePad.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string) => void;
  onClear?: () => void;
  className?: string;
  height?: number;
}

export function SignaturePad({ onSignatureChange, onClear, className = '', height = 128 }: SignaturePadProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      initCanvas(canvas);
    }
  }, []);

  const initCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c1917';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const pos = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL());
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSignatureChange('');
        if (onClear) onClear();
      }
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full bg-white border-2 border-stone-200 rounded-xl cursor-crosshair touch-none"
          style={{ height: `${height}px`, touchAction: 'none' }}
        />
        {hasSignature && (
          <button
            type="button"
            onClick={clearSignature}
            className="absolute top-2 right-2 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-600 transition-colors"
          >
            {t('common_clear')}
          </button>
        )}
      </div>
      <p className="text-xs text-stone-400 mt-1">{t('checkin_signature_instruction')}</p>
    </div>
  );
}
