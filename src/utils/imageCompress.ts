// Client-side image compression for Lost & Found photos
// Resizes long edge and outputs JPEG data URL under ~targetKB

export async function compressImageFile(
  file: File,
  options: { maxEdge?: number; quality?: number; targetMaxBytes?: number } = {}
): Promise<string> {
  const maxEdge = options.maxEdge ?? 1600;
  const quality = options.quality ?? 0.72;
  const targetMaxBytes = options.targetMaxBytes ?? 900_000;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);

  // Iteratively lower quality if still large
  while (dataUrl.length * 0.75 > targetMaxBytes && q > 0.4) {
    q -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }

  return dataUrl;
}

export async function compressImageFiles(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  const out: string[] = [];
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue;
    out.push(await compressImageFile(f));
  }
  return out;
}
