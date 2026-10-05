import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SOCEngine } from '../js/simulation.js';
import { captureLab, restoreLab } from '../lib/lab-snapshot.js';
import { createLabServer } from '../server.js';

test('snapshot restores evidence, decisions and counters without ID reuse', () => {
  const engine = new SOCEngine({ seed: true });
  const alert = engine.state.alerts.find(a => a.analysis && !a.decision);
  engine.decide(alert.id, 'approve');
  const saved = JSON.parse(JSON.stringify(captureLab(engine, new Map())));
  const restored = new SOCEngine({ seed: false });
  restoreLab(restored, new Map(), JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.state, saved.state);
  const oldIds = new Set(restored.state.events.map(e => e.id));
  const event = restored.ingest({ sourceIp: '192.168.1.8', eventType: 'PAGE_ACCESS' });
  assert.equal(oldIds.has(event.id), false);
  assert.equal(restored.serial, saved.counters.serial + 1);
  assert.equal(saved.state.events.length, engine.state.events.length, 'Checkpoint is independent of later mutations');
});

test('invalid snapshot is rejected without replacing the current lab', () => {
  const engine = new SOCEngine({ seed: false });
  const saved = captureLab(engine, new Map());
  for (const corrupt of [{ ...saved, version: 99 }, { ...saved, counters: { ...saved.counters, serial: -1 } }, { ...saved, registrations: [['plaintext-token', {}]] }]) {
    assert.throws(() => restoreLab(engine, new Map(), corrupt), /invalid saved lab/);
    assert.deepEqual(engine.state, saved.state);
  }
});

test('failed database write rolls back registration, rejects later mutations and reports unhealthy', async t => {
  let saved, writes = 0;
  const storage = {
    async load(initial) { saved = structuredClone(initial); return saved; },
    async save(value) { if (++writes > 1) throw new Error('Private connection details must never reach the client'); saved = structuredClone(value); },
    async close() {}
  };
  const lab = createLabServer({ storage });
  await lab.ready;
  await new Promise(resolve => lab.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { lab.stop(); await lab.closed; });
  const base = `http://127.0.0.1:${lab.server.address().port}`;
  const register = hostname => fetch(base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostname, role: 'Test Device' }) });
  const first = await (await register('SAVED-PHONE')).json();
  assert.ok(first.token);
  assert.equal(saved.registrations[0][0], createHash('sha256').update(first.token).digest('hex'));
  const stream = await fetch(base + '/api/stream');
  const reader = stream.body.getReader(); await reader.read();
  const failed = await register('UNSAVED-PHONE');
  assert.equal(failed.status, 503);
  assert.equal((await reader.read()).done, true, 'Database failure closes live updates so the console detects disconnection');
  assert.doesNotMatch(await failed.text(), /Private connection details/);
  assert.equal(lab.engine.state.devices.some(d => d.hostname === 'UNSAVED-PHONE'), false);
  assert.equal((await register('ALSO-REJECTED')).status, 503);
  assert.equal((await fetch(base + '/api/health')).status, 503);
  assert.equal((await fetch(base + '/api/state')).status, 503);
});
