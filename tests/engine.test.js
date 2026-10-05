import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCEngine } from '../js/simulation.js';
import { scenarios } from '../data/mock-events.js';
const finish = engine => engine.tick(Date.now() + 20000);
function run(engine, id) { engine.startScenario(id); const scenario = scenarios.find(s => s.id === id); for (let i = 0; i < scenario.count; i++) engine.tick(); finish(engine); }

test('normal activity generates events without security alerts', () => {
  const e = new SOCEngine({ seed: false }); run(e, 'normal');
  assert.equal(e.state.totalEvents, 12); assert.equal(e.state.alerts.length, 0); assert.equal(e.state.running, null);
});
for (const [id, rule] of [['failed', 'failures'], ['compromise', 'compromise'], ['ports', 'ports'], ['api', 'api'], ['privilege', 'privilege'], ['files', 'files'], ['exfil', 'exfil'], ['mixed', 'compromise']]) {
  test(`${id} scenario correlates evidence and completes an explainable assessment`, () => {
    const e = new SOCEngine({ seed: false }); run(e, id);
    const a = e.state.alerts.find(a => a.rule === rule); assert.ok(a, `Expected ${rule}`); assert.ok(a.analysis); assert.ok(a.eventIds.length); assert.ok(a.analysis.narrative); assert.equal(a.analysis.context.length, 4);
    assert.ok(a.eventIds.every(id => e.state.events.some(event => event.id === id)));
  });
}
test('mixed traffic suppresses maintenance based on policy context', () => {
  const e = new SOCEngine({ seed: false }); run(e, 'mixed');
  const a = e.state.alerts.find(a => a.rule === 'maintenance'); assert.equal(a.analysis.classification, 'False positive'); assert.equal(a.state, 'Suppressed');
});
test('containment requires completed analysis and an explicit decision, then blocks later requests', () => {
  const e = new SOCEngine({ seed: false }); e.startScenario('compromise');
  for (let i = 0; i < 7; i++) e.tick(); const a = e.state.alerts.find(a => a.rule === 'compromise');
  assert.throws(() => e.decide(a.id, 'approve'), /Wait/); assert.equal(e.state.blocked.length, 0);
  e.action('stop'); finish(e); assert.equal(a.analysis.confidence, 94); e.decide(a.id, 'approve');
  const event = e.ingest({ sourceIp: a.sourceIp, destinationIp: a.destinationIp, eventType: 'LOGIN_SUCCESS' });
  assert.equal(event.action, 'Blocked'); assert.equal(event.status, 403); assert.equal(e.device(a.sourceIp).status, 'Simulated blocked');
  assert.equal(e.state.responses.length, 1); assert.throws(() => e.decide(a.id, 'approve'), /already/);
});
test('reject and escalate record decisions without blocking the source', () => {
  for (const decision of ['reject', 'escalate']) { const e = new SOCEngine({ seed: false }); run(e, 'compromise'); e.decide(e.state.alerts[0].id, decision); assert.equal(e.state.blocked.length, 0); assert.equal(e.state.responses[0].decision, decision); }
});
test('correlation isolates source, destination, account and time window', () => {
  const e = new SOCEngine({ seed: false }); const now = Date.now();
  for (let i = 0; i < 4; i++) e.ingest({ sourceIp: '192.168.1.12', destinationIp: '192.168.1.25', eventType: 'LOGIN_FAILED', user: 'admin', timestamp: new Date(now - 120000).toISOString() });
  e.ingest({ sourceIp: '192.168.1.12', destinationIp: '192.168.1.25', eventType: 'LOGIN_FAILED', user: 'admin' });
  e.ingest({ sourceIp: '192.168.1.12', destinationIp: '192.168.1.25', eventType: 'LOGIN_SUCCESS', user: 'other' });
  assert.equal(e.state.alerts.length, 0);
});
test('new evidence invalidates analysis and extends the timeline', () => {
  const e = new SOCEngine({ seed: false }); run(e, 'compromise'); const a = e.state.alerts.find(a => a.rule === 'compromise'); const old = a.eventIds.length;
  e.ingest({ sourceIp: a.sourceIp, destinationIp: a.destinationIp, eventType: 'ADMIN_ACCESS', user: a.user });
  assert.equal(a.analysis, null); assert.ok(a.eventIds.length > old); finish(e); assert.ok(a.analysis);
});
test('registration validation and full reset', () => {
  const e = new SOCEngine(); assert.ok(e.state.alerts.length); assert.ok(e.state.events.every(x => x.fixture));
  assert.throws(() => e.register({ hostname: 'BAD-DEVICE', ip: '8.8.8.8', role: 'Test Device' }), /private/);
  assert.throws(() => e.register({ hostname: 'BAD-DEVICE', ip: '10...', role: 'Test Device' }), /private/);
  assert.throws(() => e.register({ hostname: 'BAD-DEVICE', ip: '192.168.1.8', role: 'Test Device' }), /already/);
  e.register({ hostname: 'NEW-DEVICE', ip: '192.168.1.30', role: 'Test Device', os: 'Android' }); assert.equal(e.state.devices.length, 6);
  e.action('reset'); assert.equal(e.state.totalEvents, 0); assert.equal(e.state.alerts.length, 0); assert.equal(e.state.blocked.length, 0); assert.equal(e.state.devices.length, 5); assert.equal(e.state.responses.length, 0);
});
