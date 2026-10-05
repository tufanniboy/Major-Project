import { createHash, timingSafeEqual } from 'node:crypto';

export function validSensorToken(configured, authorization = '') {
  if (!configured || !authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice(7);
  if (!supplied) return false;
  const a = createHash('sha256').update(configured).digest(), b = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(a, b);
}
