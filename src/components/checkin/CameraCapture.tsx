// src/components/checkin/CameraCapture.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function CameraCapture({ onCapture, onCancel, className = '' }: CameraCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    setIsActive(true);
    
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      setIsActive(false);
      let message = t('error_camera_denied');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = t('error_camera_permission');
        } else if (err.name === 'NotFoundError') {
          message = t('error_camera_not_found');
        } else {
          message = err.message;
        }
      }
      setError(message);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    if (onCancel) onCancel();
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 text-sm text-center">{error}</p>
        <button
          onClick={startCamera}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          {t('common_retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {!isActive ? (
        <button
          onClick={startCamera}
          className="w-full py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Camera size={18} />
          {t('common_open_camera')}
        </button>
      ) : (
        <div className="relative">
          <div className="aspect-[3/2] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={stopCamera}
              className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X size={20} />
            </button>
            <button
              onClick={capturePhoto}
              className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-lg"
            >
              <Camera size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
