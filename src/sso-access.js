import jwt from 'jsonwebtoken';
import { getCookie, setCookie } from 'hono/cookie';

export function createSsoAuthMiddleware(config) {
  return async (c, next) => {
    const api = c.req.path === '/api' || c.req.path.startsWith('/api/');
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'no-referrer');
    const reject = () => api ? c.json({ error: 'Authentication required' }, 401) : c.redirect(config.dashboardUrl);
    const queryToken = !api && c.req.method === 'GET' ? c.req.query('auth_token') : undefined;
    const token = queryToken || getCookie(c, 'wannav_sso');
    if (!token) return reject();
    let user;
    try {
      user = jwt.verify(token, config.secret, { algorithms: ['HS256'] });
      const now = Math.floor(Date.now() / 1000);
      if (typeof user !== 'object' || user.type !== 'sso' || !user.userId || typeof user.username !== 'string' ||
          !['admin', 'leader', 'crew'].includes(user.role) || !Number.isFinite(user.iat) || !Number.isFinite(user.exp) ||
          user.iat > now + 60 || user.exp <= now || user.exp <= user.iat || user.exp - user.iat > 3600 ||
          new URL(user.targetUrl).origin !== config.appOrigin) return reject();
    } catch {
      setCookie(c, 'wannav_sso', '', { httpOnly: true, secure: config.secure, sameSite: 'Lax', maxAge: 0, path: '/' });
      return reject();
    }
    c.set('user', { id: user.userId, username: user.username, role: user.role });
    if (queryToken) {
      setCookie(c, 'wannav_sso', token, { httpOnly: true, secure: config.secure, sameSite: 'Lax', maxAge: Math.min(3600, user.exp - Math.floor(Date.now() / 1000)), path: '/' });
      const url = new URL(c.req.url);
      url.searchParams.delete('auth_token');
      return c.redirect(url.pathname + url.search);
    }
    return next();
  };
}
