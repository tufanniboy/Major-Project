import { createHash } from 'node:crypto';
import { isPrivateIp } from '../js/simulation.js';

const clean = (value, max = 160) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const integer = (value, min, max, fallback = 0) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const eventTypes = new Map([[4624, 'LOGIN_SUCCESS'], [4625, 'LOGIN_FAILED'], [4688, 'SYSTEM_ACTIVITY'], [4720, 'PRIVILEGE_CHANGE'], [4722, 'PRIVILEGE_CHANGE'], [4728, 'PRIVILEGE_CHANGE'], [4732, 'PRIVILEGE_CHANGE'], [4756, 'PRIVILEGE_CHANGE']]);

export function normalizeWindowsEvent(record, now = Date.now()) {
  const id = Number(record?.eventId);
  if (!record || !Number.isInteger(id) || (!eventTypes.has(id) && id !== 5152)) return null;
  const agentIp = clean(record.agentIp, 45), remoteIp = clean(record.remoteIp, 45);
  if (!isPrivateIp(agentIp)) throw new Error('Windows collector must provide its private IPv4 address as agentIp.');
  const sourceIp = isPrivateIp(remoteIp) ? remoteIp : agentIp;
  const parsed = Date.parse(record.timestamp), timestamp = new Date(Number.isFinite(parsed) && Math.abs(parsed - now) < 86400000 * 30 ? parsed : now).toISOString();
  const protocol = clean(record.protocol || 'HOST', 16).toUpperCase();
  const eventType = id === 5152 ? protocol === 'ICMP' ? 'ICMP_ACTIVITY' : 'NETWORK_ALERT' : eventTypes.get(id);
  const sourceEventId = createHash('sha256').update(`${clean(record.computer,80)}|${clean(record.logName,100)}|${id}|${clean(record.recordId,40)}`).digest('hex');
  const detail = clean(record.detail || `Windows event ${id}`, 180);
  return { sourceIp, destinationIp: agentIp, hostname: sourceIp === agentIp ? clean(record.computer,40).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40) || `WIN-${agentIp.split('.').at(-1)}` : `HOST-${sourceIp.split('.').at(-1)}`, timestamp,
    port: integer(record.port,0,65535), protocol, eventType, user: clean(record.user || 'unknown',80), risk: ['LOGIN_FAILED','PRIVILEGE_CHANGE','NETWORK_ALERT','ICMP_ACTIVITY'].includes(eventType) ? 'medium' : 'low',
    origin: 'Windows Event Log', truth: 'unlabeled', sourceEventId, windowsEvent: { eventId:id, logName:clean(record.logName,100), detail, agentIp, remoteIp } };
}

export function normalizeWindowsBatch(input, now = Date.now()) {
  const records = Array.isArray(input) ? input : [input];
  if (!records.length || records.length > 100) throw new Error('Send between 1 and 100 Windows event records per request.');
  const events = [], unsupported = [];
  records.forEach((record,index) => { const event = normalizeWindowsEvent(record,now); if(event) events.push(event); else unsupported.push(index); });
  return {events,unsupported};
}
