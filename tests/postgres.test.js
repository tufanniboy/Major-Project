import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { PostgresStore } from '../lib/postgres-store.js';
import { createLabServer } from '../server.js';
import { captureLab } from '../lib/lab-snapshot.js';
import { SOCEngine } from '../js/simulation.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const options = { skip: !databaseUrl, timeout: 30000 };

async function fixture(t) {
  const labId = `test-${randomUUID()}`;
  const inspection = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  t.after(async () => {
    // Only this test's randomly named row is removed; never reset a real lab.
    try { await inspection.query('DELETE FROM soc_lab_snapshots WHERE lab_id = $1', [labId]); }
    finally { await inspection.end(); }
  });
  return { labId, inspection, store: () => new PostgresStore(databaseUrl, { labId }) };
}

test('PostgreSQL restores independent devices, attack progress, decisions and reset across restarts', options, async t => {
  const { store, inspection, labId } = await fixture(t);
  let lab;
  t.after(async () => { if (lab?.server.listening) { lab.stop(); await lab.closed; } });
  const start = async () => {
    lab = createLabServer({ storage: store() });
    await lab.ready;
    await new Promise(resolve => lab.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${lab.server.address().port}`;
  };
  let base = await start();
  const post = (route, body, token) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Device-Token': token } : {}) }, body: JSON.stringify(body) });
  const register = async hostname => (await post('/api/register', { hostname, role: 'Test Device', os: 'Test OS' })).json();
  const [phone, laptop] = await Promise.all([register('PG-PHONE'), register('PG-LAPTOP')]);
  assert.notEqual(phone.device.ip, laptop.device.ip);
  assert.equal((await post('/api/portal', { action: 'demo-sequence', scenario: 'privilege' }, phone.token)).status, 202);
  assert.equal((await post('/api/portal', { action: 'demo-sequence', scenario: 'ports' }, laptop.token)).status, 202);
  await delay(1200);
  lab.stop(); await lab.closed;
  const saved = (await inspection.query('SELECT payload FROM soc_lab_snapshots WHERE lab_id = $1', [labId])).rows[0].payload;
  assert.ok(saved.state.events.some(e => e.scenarioId === 'privilege'));
  assert.equal(JSON.stringify(saved).includes(phone.token), false, 'Only token hashes are stored');
  base = await start();
  assert.deepEqual(lab.engine.state, saved.state);
  const heartbeat = await post('/api/portal', { action: 'heartbeat' }, laptop.token);
  assert.equal(heartbeat.status, 200, 'Existing participant token survives a backend restart');
  assert.equal((await heartbeat.json()).simulation.index, saved.state.devices.find(d => d.ip === laptop.device.ip).simulation.index);
  let alert;
  for (let i = 0; i < 22; i++) {
    const state = await (await fetch(base + '/api/state')).json();
    alert = state.alerts.find(a => a.sourceIp === phone.device.ip && a.analysis);
    if (alert) break;
    await delay(500);
  }
  assert.ok(alert, 'Resumed simulation produces a completed investigation');
  assert.equal((await post('/api/action', { name: 'decision', payload: { id: alert.id, decision: 'approve' } })).status, 200);
  lab.stop(); await lab.closed;
  base = await start();
  assert.ok(lab.engine.state.blocked.includes(phone.device.ip));
  assert.ok(lab.engine.state.responses.some(r => r.alertId === alert.id));
  assert.equal((await post('/api/portal', { action: 'probe' }, phone.token)).status, 403);
  assert.equal((await post('/api/portal', { action: 'probe' }, laptop.token)).status, 200);
  const ids = lab.engine.state.events.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal((await post('/api/action', { name: 'reset' })).status, 200);
  lab.stop(); await lab.closed;
  base = await start();
  assert.equal(lab.engine.state.events.length, 0);
  assert.equal(lab.engine.state.alerts.length, 0);
  assert.equal(lab.engine.state.devices.length, 5);
  assert.equal((await post('/api/portal', { action: 'heartbeat' }, phone.token)).status, 401);
});

test('PostgreSQL rejects a stale writer and preserves the committed checkpoint', options, async t => {
  const { store } = await fixture(t);
  const first = store(), second = store();
  t.after(async () => { await Promise.all([first.close(), second.close()]); });
  const initial = captureLab(new SOCEngine({ seed: false }), new Map());
  await first.load(initial); await second.load(initial);
  const changed = structuredClone(initial); changed.state.normalTraffic = true;
  await first.save(changed);
  await assert.rejects(second.save(initial), /Another server changed/);
  assert.deepEqual(await second.load(initial), changed);
});

test('PostgreSQL startup refuses an unsupported checkpoint without resetting it', options, async t => {
  const { store, inspection, labId } = await fixture(t);
  const writer = store();
  await writer.load({ version: 999 }); await writer.close();
  const storage = store();
  const lab = createLabServer({ storage });
  await assert.rejects(lab.ready, /invalid saved lab/);
  lab.stop(); await lab.closed;
  const payload = (await inspection.query('SELECT payload FROM soc_lab_snapshots WHERE lab_id = $1', [labId])).rows[0].payload;
  assert.deepEqual(payload, { version: 999 });
});
