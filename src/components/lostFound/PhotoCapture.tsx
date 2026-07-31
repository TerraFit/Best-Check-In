// src/components/lostFound/PhotoCapture.tsx
import { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, X } from 'lucide-react';
import { compressImageFiles } from '../../utils/imageCompress';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  required?: boolean;
}

export default function PhotoCapture({ photos, onChange, maxPhotos = 6, required }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        setErr(`Maximum ${maxPhotos} photos`);
        return;
      }
      const slice = Array.from(files).slice(0, remaining);
      const compressed = await compressImageFiles(slice);
      onChange([...photos, ...compressed]);
    } catch (e: any) {
      setErr(e.message || 'Failed to process photos');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const removeAt = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-stone-500">
          Photos {required ? <span className="text-red-500">*</span> : null}
          <span className="font-normal text-stone-400 ml-1">
            ({photos.length}/{maxPhotos})
          </span>
        </label>
        {busy && <span className="text-[10px] text-amber-600">Compressing…</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 group">
            <button type="button" className="w-full h-full" onClick={() => setPreview(src)}>
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-90 hover:bg-red-600"
              title="Delete photo"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 text-stone-500 hover:border-amber-400 hover:text-amber-700 text-[10px] font-semibold"
            >
              <Camera size={18} />
              Camera
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 text-stone-500 hover:border-amber-400 hover:text-amber-700 text-[10px] font-semibold"
            >
              <ImagePlus size={18} />
              Upload
            </button>
          </>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {required && photos.length === 0 && (
        <p className="text-[11px] text-red-500">At least one photo is required.</p>
      )}
      {err && <p className="text-[11px] text-red-500">{err}</p>}

      {preview && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setPreview(null)}
          >
            <X size={24} />
          </button>
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
