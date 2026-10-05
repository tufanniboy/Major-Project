import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const digest = value => createHash('sha256').update(String(value || '')).digest();
export function createHostedAuth({ password, joinCode, publicUrl }) {
  if (!password || password.length < 12) throw new Error('SOC_ADMIN_PASSWORD must contain at least 12 characters.');
  if (!joinCode || joinCode.length < 24) throw new Error('LAB_JOIN_CODE must contain at least 24 characters.');
  const url = new URL(publicUrl);
  const localPreview = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(localPreview && url.protocol === 'http:')) throw new Error('PUBLIC_URL must use HTTPS.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_URL must be the site origin only.');
  const sessions = new Map(), attempts = new Map(), lifetime = 4 * 60 * 60 * 1000;
  const secure = url.protocol === 'https:', cookieName = secure ? '__Host-soc_session' : 'soc_preview_session';
  const tokenFor = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const valid = token => Boolean(token && (sessions.get(token) || 0) > Date.now());
  const cookie = (token, maxAge) => `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  return {
    origin: url.origin,
    portalUrl: `${url.origin}/employee.html?join=${encodeURIComponent(joinCode)}`,
    tokenFor, valid,
    authorized: req => valid(tokenFor(req)),
    validInvitation: value => timingSafeEqual(digest(value), digest(joinCode)),
    login(value, peer) {
      const now = Date.now();
      for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
      const entry = attempts.get(peer) || { count: 0, until: now + 60000 };
      if (entry.count >= 10 || (!attempts.has(peer) && attempts.size >= 1000)) return { status: 429, error: 'Too many sign-in attempts. Try again in one minute.' };
      entry.count++; attempts.set(peer, entry);
      if (!timingSafeEqual(digest(value), digest(password))) return { status: 401, error: 'Incorrect analyst password.' };
      for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token);
      if (sessions.size >= 50) return { status: 429, error: 'Analyst session limit reached. Sign out of another session or try later.' };
      const token = randomBytes(32).toString('base64url');
      sessions.set(token, now + lifetime); attempts.delete(peer);
      return { status: 200, cookie: cookie(token, lifetime / 1000) };
    },
    logout(req) { sessions.delete(tokenFor(req)); return cookie('', 0); }
  };
}
