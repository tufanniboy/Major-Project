import { deviceScenarios } from '../js/device-scenarios.js';

export function captureLab(engine, registrations) {
  return structuredClone({ version: 1, state: engine.state,
    counters: { serial: engine.serial, alertSerial: engine.alertSerial, tickCount: engine.tickCount },
    registrations: [...registrations] });
}

export function restoreLab(engine, registrations, snapshot) {
  const fail = () => { throw new Error('Unsupported or invalid saved lab. Database contents were not replaced.'); };
  if (snapshot?.version !== 1 || !snapshot.state || !snapshot.counters || !Array.isArray(snapshot.registrations)) fail();
  const { state, counters } = snapshot;
  for (const key of ['events', 'alerts', 'devices', 'responses', 'blocked', 'rate']) if (!Array.isArray(state[key])) fail();
  for (const key of ['serial', 'alertSerial', 'tickCount']) if (!Number.isSafeInteger(counters[key]) || counters[key] < 0) fail();
  for (const key of ['totalEvents', 'revision', 'generation']) if (!Number.isSafeInteger(state[key]) || state[key] < 0) fail();
  if (state.sensor && (!Number.isSafeInteger(state.sensor.received) || state.sensor.received < 0 || (state.sensor.lastSeen !== null && typeof state.sensor.lastSeen !== 'string') || (state.sensor.recentIds !== undefined && (!Array.isArray(state.sensor.recentIds) || state.sensor.recentIds.length>5000 || state.sensor.recentIds.some(id=>!/^[a-f0-9]{64}$/.test(id)))))) fail();
  if (counters.serial < 1000 || counters.alertSerial < 840 || typeof state.normalTraffic !== 'boolean') fail();
  if (state.events.some(e => !/^EVT-\d+$/.test(e.id) || Number(e.id.slice(4)) > counters.serial)) fail();
  if (state.alerts.some(a => !/^SOC-\d+$/.test(a.id) || Number(a.id.slice(4)) > counters.alertSerial)) fail();
  for (const entry of snapshot.registrations) {
    if (!Array.isArray(entry) || entry.length !== 2) fail();
    const [tokenHash, session] = entry;
    if (!/^[a-f0-9]{64}$/.test(tokenHash) || !session || !state.devices.some(d => d.ip === session.ip) || !Number.isFinite(session.heartbeat) || typeof session.peer !== 'string') fail();
    if (session.demo) {
      const scenario = deviceScenarios.find(s => s.id === session.demo.id);
      if (!scenario || !Number.isInteger(session.demo.index) || session.demo.index < 0 || session.demo.index >= scenario.count || !state.devices.find(d => d.ip === session.ip).simulation) fail();
    }
  }
  const copy = structuredClone(snapshot);
  copy.state.sensor ||= { received: 0, lastSeen: null, recentIds: [] };
  copy.state.sensor.recentIds ||= [];
  engine.state = copy.state;
  Object.assign(engine, copy.counters);
  registrations.clear();
  for (const [hash, session] of copy.registrations) registrations.set(hash, session);
}
