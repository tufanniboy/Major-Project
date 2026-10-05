import { createHash, timingSafeEqual } from 'node:crypto';
import { isPrivateIp } from '../js/simulation.js';

const limit = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const integer = (value, min, max, fallback = 0) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const risk = severity => severity === 1 ? 'critical' : severity === 2 ? 'high' : 'medium';
const eventKind = (signature, category) => {
  const value = `${signature} ${category}`.toLowerCase();
  if (/brute|password|login|authentication/.test(value)) return 'LOGIN_FAILED';
  if (/port.?scan|network.?scan|service.?scan|reconnaissance/.test(value)) return 'PORT_ATTEMPT';
  if (/privilege|elevation|account manipulation/.test(value)) return 'PRIVILEGE_CHANGE';
  if (/exfil|data.?loss|large.?transfer/.test(value)) return 'LARGE_TRANSFER';
  if (/file|document|collection/.test(value)) return 'SENSITIVE_FILE';
  return 'NETWORK_ALERT';
};

export function validSensorToken(configured, authorization = '') {
  if (!configured || !authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice(7);
  if (!supplied) return false;
  const a = createHash('sha256').update(configured).digest(), b = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(a, b);
}

export function normalizeSuricata(record, now = Date.now()) {
  if (!record || record.event_type !== 'alert' || !record.alert) return null;
  const sourceIp = limit(record.src_ip, 45), destinationIp = limit(record.dest_ip, 45);
  if (!isPrivateIp(sourceIp) || !isPrivateIp(destinationIp)) throw new Error('Suricata lab alerts must contain private IPv4 source and destination addresses.');
  const parsed = Date.parse(record.timestamp), timestamp = new Date(Number.isFinite(parsed) && Math.abs(parsed - now) < 86400000 * 30 ? parsed : now).toISOString();
  const signature = limit(record.alert.signature, 180) || 'Suricata network alert';
  const category = limit(record.alert.category, 100) || 'Uncategorized network alert';
  const signatureId = integer(record.alert.signature_id, 1, 2147483647);
  const severity = integer(record.alert.severity, 1, 3, 3);
  const port = integer(record.dest_port, 0, 65535);
  const protocol = limit(record.app_proto || record.proto || 'IP', 16).toUpperCase();
  const sourceEventId = createHash('sha256').update(JSON.stringify([record.flow_id ?? '', record.timestamp ?? '', sourceIp, destinationIp, record.src_port ?? '', port, signatureId, signature])).digest('hex');
  return { hostname:`NET-${sourceIp.split('.').at(-1)}`, sourceIp, destinationIp, timestamp, port, protocol, bytes:integer(record.flow?.bytes_toserver,0,Number.MAX_SAFE_INTEGER,0), eventType:eventKind(signature,category), user:'network', origin:'Suricata EVE sensor', truth:'unlabeled', risk:risk(severity),
    sensorAlert:{signature,category,signatureId,severity,sourceEventId,sensor:'Suricata'} };
}

export function normalizeSuricataBatch(input, now = Date.now()) {
  const records = Array.isArray(input) ? input : [input];
  if (!records.length || records.length > 100) throw new Error('Send between 1 and 100 Suricata records per request.');
  const events = [], unsupported = [];
  records.forEach((record,index) => {
    const event = normalizeSuricata(record,now);
    if(event) events.push(event); else unsupported.push(index);
  });
  return {events,unsupported};
}
