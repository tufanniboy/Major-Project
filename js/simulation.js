import { initialDevices, scenarios, eventLabels, roles } from '../data/mock-events.js';
import { detectRules } from './alerts.js';
import { analyzeAlert, analysisStages } from './ai-analysis.js';

export class SOCEngine {
  constructor({ seed = true } = {}) { this.reset(seed); }
  reset(seed = false) {
    this.state = { events: [], alerts: [], devices: initialDevices(), responses: [], blocked: [], running: null, normalTraffic: false, totalEvents: 0, rate: [], sensor: { received: 0, lastSeen: null, recentIds: [] }, generation: Date.now(), revision: 0 };
    this.serial = 1000; this.alertSerial = 840; this.tickCount = 0;
    if (seed) this.seed();
    return this.state;
  }
  seed() {
    const now = Date.now();
    for (let i = 0; i < 90; i++) this.ingest({ sourceIp: '192.168.1.8', destinationIp: '192.168.1.20', eventType: scenarios[0].types[i % 12], user: 'employee01', timestamp: new Date(now - 300000 + i * 2800).toISOString(), fixture: true, truth: 'benign' });
    for (const [id, offset] of [['mixed', 45000], ['files', 25000], ['ports', 12000], ['privilege', 6000]]) {
      const s = scenarios.find(x => x.id === id);
      s.types.forEach((type, i) => this.ingest({ ...this.scenarioEvent(s, i), timestamp: new Date(now - offset + i * 600).toISOString(), fixture: true }));
    }
    for (const a of this.state.alerts) this.finishAnalysis(a, Date.now());
    this.state.rate = Array.from({ length: 40 }, (_, i) => ({ time: now - (39 - i) * 5000, count: this.state.events.filter(e => { const t = Date.parse(e.timestamp); return t > now - (40 - i) * 5000 && t <= now - (39 - i) * 5000; }).length / 5 }));
  }
  device(ip) { return this.state.devices.find(d => d.ip === ip); }
  register(input, { synthetic = true } = {}) {
    const hostname = String(input.hostname || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(hostname)) throw new Error('Use a hostname of 2–40 letters, numbers, hyphens or underscores.');
    const ip = String(input.ip || '');
    if (!isPrivateIp(ip)) throw new Error('Use a private IPv4 lab address (10.x, 172.16–31.x, or 192.168.x).');
    if (this.device(ip)) throw new Error('This IP address is already registered.');
    if (!roles.includes(input.role)) throw new Error('Choose a valid device role.');
    const now = new Date().toISOString();
    const d = { id: `DEV-${String(this.state.devices.length + 1).padStart(3, '0')}`, hostname, ip, role: input.role, os: String(input.os || 'Unknown').slice(0, 30), trust: 'Untrusted', status: 'Connected', firstSeen: now, lastSeen: now, events: 0, bytes: 0, risk: 20, mac: 'Not collected', synthetic };
    this.state.devices.push(d);
    this.ingest({ sourceIp: ip, destinationIp: '192.168.1.5', eventType: 'DEVICE_REGISTERED', user: 'device', truth: synthetic ? 'malicious' : 'unlabeled', origin: synthetic ? 'Synthetic registration' : 'Lab portal' });
    return d;
  }
  observe(input) {
    const existing = this.device(input.ip);
    if (existing) return existing;
    if (!isPrivateIp(input.ip)) throw new Error('Sensor observations require a private IPv4 lab address.');
    const hostname = String(input.hostname || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `HOST-${input.ip.split('.').at(-1)}`;
    const now = new Date().toISOString();
    const device = { id: `DEV-${String(this.state.devices.length + 1).padStart(3, '0')}`, hostname, ip: input.ip, role: 'Unknown Device', os: 'Observed network source', trust: 'Untrusted', status: 'Observed', firstSeen: now, lastSeen: now, events: 0, bytes: 0, risk: 20, mac: 'Not collected', synthetic: false, sensorManaged: true };
    this.state.devices.push(device);
    return device;
  }
  ingest(input) {
    const timestamp = input.timestamp || new Date().toISOString();
    const device = this.device(input.sourceIp);
    if (!device) throw new Error('Source device is not registered.');
    const blocked = this.state.blocked.includes(input.sourceIp);
    const type = input.eventType;
    const risky = ['NETWORK_ALERT', 'ICMP_ACTIVITY', 'LOGIN_FAILED', 'API_DENIED', 'PORT_ATTEMPT', 'ADMIN_ACCESS', 'SENSITIVE_FILE', 'LARGE_TRANSFER', 'PRIVILEGE_CHANGE'].includes(type);
    const suppliedRisk = ['low', 'medium', 'high', 'critical'].includes(input.risk) ? input.risk : null;
    const event = { id: `EVT-${++this.serial}`, timestamp, sourceIp: input.sourceIp, destinationIp: input.destinationIp || '192.168.1.20', sourceDevice: device.hostname, destinationDevice: this.device(input.destinationIp)?.hostname || 'LAB-SERVICE', protocol: input.protocol || (type === 'DNS_REQUEST' ? 'DNS' : type === 'PORT_ATTEMPT' ? 'TCP' : 'HTTPS'), port: input.port ?? (type === 'DNS_REQUEST' ? 53 : 443), eventType: type, user: input.user || 'employee01', status: blocked ? 403 : type === 'LOGIN_FAILED' ? 401 : type === 'API_DENIED' ? 403 : 200, risk: blocked ? 'low' : suppliedRisk || (['PRIVILEGE_CHANGE', 'LARGE_TRANSFER'].includes(type) ? 'critical' : risky ? 'medium' : 'low'), action: blocked ? 'Blocked' : risky ? 'Monitoring' : 'Allowed', label: blocked ? eventLabels.REQUEST_BLOCKED : input.label || input.windowsEvent?.detail || eventLabels[type] || type, bytes: blocked ? 0 : input.bytes || 1024, origin: input.origin || 'Synthetic', scenarioId: input.scenarioId, truth: input.truth || 'unlabeled', changeRef: input.changeRef, fixture: Boolean(input.fixture), sourceEventId: input.sourceEventId, windowsEvent: input.windowsEvent };
    this.state.events.unshift(event); this.state.totalEvents++; this.state.revision++;
    device.events++; device.bytes += event.bytes; device.lastSeen = timestamp;
    if (!blocked) device.risk = Math.max(device.risk, event.risk === 'critical' ? 96 : risky ? 58 : 8);
    const recent = this.state.events.filter(e => Date.parse(timestamp) - Date.parse(e.timestamp) <= 60000 && Date.parse(timestamp) >= Date.parse(e.timestamp));
    if (input.origin === 'Windows Event Log') { this.state.sensor ||= { received: 0, lastSeen: null, recentIds: [] }; this.state.sensor.recentIds ||= []; this.state.sensor.received++; this.state.sensor.lastSeen = timestamp; if (input.sourceEventId) this.state.sensor.recentIds.push(input.sourceEventId); this.state.sensor.recentIds=this.state.sensor.recentIds.slice(-5000); }
    for (const hit of detectRules(event, recent, device)) {
      let alert = this.state.alerts.find(a => a.rule === hit.rule && a.sourceIp === event.sourceIp && a.destinationIp === event.destinationIp && a.user === event.user && Date.parse(timestamp) - Date.parse(a.timestamp) < 60000 && !a.decision);
      if (alert) {
        alert.eventIds = [...new Set([...alert.eventIds, ...hit.evidence.map(e => e.id)])];
        // New evidence invalidates the previous assessment and must be analyzed again.
        alert.analysis = null; alert.stage = 1; alert.analysisStart = Date.now(); alert.state = analysisStages[1];
        if (alert.llm) { alert.llm.status = 'Stale'; alert.llm.answer = null; alert.llm.error = 'New evidence arrived. Ask the model again after collection finishes.'; }
      } else {
        alert = { id: `SOC-${++this.alertSerial}`, timestamp, sourceIp: event.sourceIp, destinationIp: event.destinationIp, user: event.user, ...hit, eventIds: hit.evidence.map(e => e.id), stage: 0, state: 'Queued', analysis: null, analysisStart: Date.now(), truth: event.truth === 'unlabeled' ? 'unlabeled' : hit.truth, decision: null };
        delete alert.evidence; this.state.alerts.unshift(alert);
      }
      device.risk = Math.max(device.risk, hit.severity === 'critical' ? 96 : hit.severity === 'high' ? 87 : 58);
    }
    // Keep recent traffic plus all evidence referenced by retained investigations.
    if (this.state.events.length > 3000) {
      const evidence = new Set(this.state.alerts.flatMap(a => a.eventIds));
      this.state.events = this.state.events.filter((e, i) => i < 1500 || evidence.has(e.id));
    }
    return event;
  }
  scenarioEvent(s, i) {
    const type = s.types[i];
    const benign = scenarios[0].types.includes(type) && !(s.id !== 'normal' && type === 'LOGIN_SUCCESS');
    const maintenance = type === 'MAINTENANCE';
    return { sourceIp: benign || maintenance ? '192.168.1.8' : s.source, destinationIp: maintenance ? '192.168.1.20' : s.target, eventType: type, user: benign ? 'employee01' : maintenance ? 'svc-maintenance' : 'admin', port: type === 'PORT_ATTEMPT' ? [21, 22, 25, 53, 80, 110, 139, 443, 445, 3389][i % 10] : 443, bytes: type === 'LARGE_TRANSFER' ? 18000000 : 1024 + i * 160, changeRef: maintenance ? 'CHG-LAB-042' : undefined, truth: benign || maintenance ? 'benign' : 'malicious' };
  }
  startScenario(id) {
    const s = scenarios.find(x => x.id === id);
    if (!s) throw new Error('Unknown scenario.');
    if (this.state.running) throw new Error('A scenario is already running. Stop it first.');
    this.state.running = { id, index: 0, count: s.count, started: Date.now() };
  }
  tick(now = Date.now()) {
    this.tickCount++;
    if (this.state.running) {
      const run = this.state.running, s = scenarios.find(x => x.id === run.id);
      this.ingest(this.scenarioEvent(s, run.index)); run.index++;
      if (run.index >= s.count) this.state.running = null;
    }
    if (this.state.normalTraffic && this.tickCount % 2 === 0) this.ingest(this.scenarioEvent(scenarios[0], this.tickCount / 2 % 12));
    for (const a of this.state.alerts.filter(a => !a.analysis && !a.decision)) {
      a.stage = Math.min(6, Math.floor((now - a.analysisStart) / 450));
      a.state = analysisStages[a.stage];
      if (a.stage === 6) this.finishAnalysis(a, now);
    }
    if (this.tickCount % 5 === 0) {
      this.state.rate.push({ time: now, count: this.state.events.filter(e => now - Date.parse(e.timestamp) < 5000).length / 5 });
      this.state.rate = this.state.rate.slice(-60);
    }
    this.state.revision++;
    return this.state;
  }
  finishAnalysis(a, now, duration) {
    a.analysis = analyzeAlert(a, this.state.events.filter(e => a.eventIds.includes(e.id)).reverse(), this.device(a.sourceIp));
    a.analysisTime = duration || (now - a.analysisStart) / 1000;
    a.completedAt = new Date(now).toISOString(); a.stage = 6; a.state = a.analysis.classification === 'False positive' ? 'Suppressed' : 'Awaiting approval';
  }
  decide(id, decision) {
    const a = this.state.alerts.find(x => x.id === id);
    if (!a?.analysis) throw new Error('Wait for the investigation to complete.');
    if (a.decision) throw new Error('This investigation already has an analyst decision.');
    if (!['approve', 'reject', 'escalate'].includes(decision)) throw new Error('Invalid response.');
    if (a.analysis.classification === 'False positive' && decision === 'approve') throw new Error('Suppressed maintenance alerts do not need containment.');
    a.decision = decision; a.state = { approve: 'Contained', reject: 'Rejected', escalate: 'Escalated' }[decision];
    if (decision === 'approve') {
      if (!this.state.blocked.includes(a.sourceIp)) this.state.blocked.push(a.sourceIp);
      this.device(a.sourceIp).status = 'Simulated blocked';
    }
    const r = { id: `IR-${this.state.responses.length + 1}`, alertId: id, sourceIp: a.sourceIp, decision, timestamp: new Date().toISOString(), analyst: 'Alex Morgan', action: decision === 'approve' ? 'Source added to simulated firewall blocklist; simulated sessions invalidated' : decision === 'reject' ? 'Recommendation rejected; source remains unchanged' : 'Escalated for senior analyst review', seconds: (Date.now() - Date.parse(a.timestamp)) / 1000 };
    this.state.responses.unshift(r); this.state.revision++; return r;
  }
  action(name, payload = {}) {
    switch (name) {
      case 'scenario': this.startScenario(payload.id); break;
      case 'stop': this.state.running = null; break;
      case 'traffic': this.state.normalTraffic = !this.state.normalTraffic; break;
      case 'reset': this.reset(false); break;
      case 'seed': this.reset(true); break;
      case 'register': return this.register(payload);
      case 'decision': return this.decide(payload.id, payload.decision);
      default: throw new Error('Unknown operation.');
    }
    return this.state;
  }
}
export function isPrivateIp(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const n = ip.split('.').map(Number);
  return n.length === 4 && n.every(x => Number.isInteger(x) && x >= 0 && x <= 255) && (n[0] === 10 || (n[0] === 192 && n[1] === 168) || (n[0] === 172 && n[1] >= 16 && n[1] <= 31));
}
