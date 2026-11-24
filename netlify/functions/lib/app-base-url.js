// Resolve links against the site that received the request. Netlify's built-in
// deploy URL variables are not consistently present inside Lambda functions.
const isFastCheckInHost = (host) =>
  host === 'fastcheckin.co.za' ||
  host === 'www.fastcheckin.co.za' ||
  /^(?:deploy-preview-\d+|[a-z0-9][a-z0-9-]*)--fastcheckin\.netlify\.app$/i.test(host);

export function getAppBaseUrl(event) {
  const requestHost = String(event?.headers?.host || event?.headers?.Host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');

  if (isFastCheckInHost(requestHost)) return `https://${requestHost}`;

  return (
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.URL ||
    'https://fastcheckin.co.za'
  ).replace(/\/$/, '');
}
