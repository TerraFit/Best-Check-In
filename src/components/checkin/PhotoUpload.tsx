// src/components/checkin/PhotoUpload.tsx
import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface PhotoUploadProps {
  onUpload: (photoDataUrl: string) => void;
  onRemove?: () => void;
  currentPhoto?: string | null;
  className?: string;
}

export function PhotoUpload({ onUpload, onRemove, currentPhoto, className = '' }: PhotoUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert(t('error_upload_image'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (currentPhoto) {
    return (
      <div className={`relative ${className}`}>
        <img src={currentPhoto} alt="Uploaded ID" className="w-full h-full object-cover rounded-xl border-2 border-amber-300" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-2"
      >
        <Upload size={24} className="text-stone-400" />
        <span className="text-sm text-stone-600">{t('common_upload_from_gallery')}</span>
        <span className="text-xs text-stone-400">JPG, PNG (max 5MB)</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
