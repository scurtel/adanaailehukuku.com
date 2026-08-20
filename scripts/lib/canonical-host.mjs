const APEX_ORIGIN = 'https://adanaailehukuku.com';
const WWW_HOST = 'www.adanaailehukuku.com';

/**
 * If the request Host is www, return a 301 Location to the apex origin.
 * Path and query string are preserved. Non-www hosts return null.
 */
export function wwwRedirectLocation(hostHeader, requestUrl = '/') {
  const host = String(hostHeader || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
  if (host !== WWW_HOST) return null;

  const raw = requestUrl || '/';
  const pathAndQuery = raw.startsWith('/') ? raw : `/${raw}`;
  return `${APEX_ORIGIN}${pathAndQuery}`;
}

export { APEX_ORIGIN, WWW_HOST };
