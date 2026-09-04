const BUCKET = 'lost-found-photos';
const SIGNED_URL_TTL = 300;

export function storagePath(value, businessId) {
  if (!value || typeof value !== 'string') return null;
  let path = value.trim();
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`;
  const signMarker = `/storage/v1/object/sign/${BUCKET}/`;
  const publicIndex = path.indexOf(publicMarker);
  const signIndex = path.indexOf(signMarker);
  if (publicIndex >= 0) path = path.slice(publicIndex + publicMarker.length);
  else if (signIndex >= 0) path = path.slice(signIndex + signMarker.length).split('?')[0];
  if (!path || path.startsWith('/') || path.includes('..')) return null;
  if (!path.startsWith(`${businessId}/`)) return null;
  return path;
}

export async function signStoragePaths(supabaseUrl, serviceKey, businessId, values) {
  const paths = (Array.isArray(values) ? values : [values]).map(v => storagePath(v, businessId));
  const valid = paths.map((path, i) => ({ path, i })).filter(x => x.path);
  if (!valid.length) return Array.isArray(values) ? [] : null;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: valid.map(x => x.path), expiresIn: SIGNED_URL_TTL }),
  });
  if (!response.ok) throw new Error('Unable to create signed Lost & Found URLs');
  const data = await response.json();
  const signed = Array.isArray(data) ? data : data.signedURLs || data.signedUrls || [];
  const result = Array(values?.length || 0).fill(null);
  valid.forEach((x, j) => {
    const entry = signed[j];
    const signedPath = entry?.signedURL || entry?.signedUrl || entry?.signed_url || (typeof entry === 'string' ? entry : null);
    if (signedPath) result[x.i] = signedPath.startsWith('http') ? signedPath : `${supabaseUrl}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`;
  });
  return Array.isArray(values) ? result.filter(Boolean) : result[0] || null;
}

export { BUCKET, SIGNED_URL_TTL };
