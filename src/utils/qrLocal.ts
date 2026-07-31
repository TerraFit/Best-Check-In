// Local QR generation using the project qrcode dependency
import QRCode from 'qrcode';

export async function generateQrDataUrl(
  text: string,
  opts?: { width?: number; margin?: number }
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts?.width ?? 200,
    margin: opts?.margin ?? 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

export function lostFoundQrPayload(item: {
  id: string;
  tag_number?: string | null;
  business_id: string;
}): string {
  // Compact payload — openable offline as text; app can deep-link later
  return JSON.stringify({
    t: 'laf',
    id: item.id,
    tag: item.tag_number || null,
    b: item.business_id,
  });
}
