export function readSsoConfig(env) {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.trim().length < 32 || /change-in-production|your-shared-secret/i.test(secret)) {
    throw new Error('JWT_SECRET must be a configured shared secret of at least 32 characters');
  }
  let appUrl, dashboard;
  try {
    appUrl = new URL(env.APP_ORIGIN || env.RENDER_EXTERNAL_URL);
    dashboard = new URL(env.DASHBOARD_URL || 'https://wannav-main.onrender.com');
  } catch { throw new Error('APP_ORIGIN and DASHBOARD_URL must be absolute URLs'); }
  for (const url of [appUrl, dashboard]) {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error('SSO URLs must use HTTPS');
  }
  if (appUrl.pathname !== '/' || appUrl.search || appUrl.hash) throw new Error('APP_ORIGIN must be an origin');
  return { secret, appOrigin: appUrl.origin, dashboardUrl: dashboard.href, secure: appUrl.protocol === 'https:' };
}
