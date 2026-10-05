import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabServer } from '../server.js';
import { deviceScenarios } from '../js/device-scenarios.js';

test('devices select different attacks concurrently, with isolated events, progress and stop controls', { timeout: 18000 }, async t => {
  const { server, engine } = createLabServer({seed:false});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(route,body,token)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Device-Token':token}:{})},body:JSON.stringify(body)});
  const devices=[];
  for(const scenario of deviceScenarios) {
    const device=await(await post('/api/register',{hostname:`MULTI-${scenario.id}`,role:'Test Device',os:'Android'})).json();
    devices.push({scenario,...device});
    assert.equal((await post('/api/portal',{action:'demo-sequence',scenario:'not-an-attack'},device.token)).status,400);
    assert.equal((await post('/api/portal',{action:'demo-sequence',scenario:scenario.id,sourceIp:'192.168.1.8'},device.token)).status,202);
    const heartbeat=await(await post('/api/portal',{action:'heartbeat'},device.token)).json();
    assert.equal(heartbeat.demo.id,scenario.id); assert.equal(heartbeat.demo.total,scenario.count);
  }
  const stopped=await(await post('/api/register',{hostname:'MULTI-STOP',role:'Test Device',os:'Windows'})).json();
  await post('/api/portal',{action:'demo-sequence',scenario:'ports'},stopped.token);
  await new Promise(resolve=>setTimeout(resolve,2200));
  const stop=await(await post('/api/portal',{action:'stop-demo'},stopped.token)).json();
  assert.equal(stop.simulation.state,'Stopped'); assert.ok(stop.simulation.index>0 && stop.simulation.index<10);
  await new Promise(resolve=>setTimeout(resolve,8400));
  for(const {scenario,device,token} of devices) {
    const events=engine.state.events.filter(e=>e.sourceIp===device.ip&&e.origin==='Portal simulation');
    assert.equal(events.length,scenario.count,scenario.id);
    assert.ok(events.every(e=>e.scenarioId===scenario.id && e.sourceDevice===device.hostname && e.destinationIp===scenario.target));
    const rule=scenario.id==='failed'?'failures':scenario.id;
    const alert=engine.state.alerts.find(a=>a.sourceIp===device.ip&&a.rule===rule);
    assert.ok(alert,`Expected ${rule} alert for ${device.hostname}`);
    assert.ok(alert.eventIds.every(id=>events.some(e=>e.id===id)), 'Evidence belongs only to this device');
    const heartbeat=await(await post('/api/portal',{action:'heartbeat'},token)).json();
    assert.equal(heartbeat.demo,null); assert.equal(heartbeat.simulation.state,'Complete');
    assert.equal((await post('/api/portal',{action:'admin'},token)).status,401);
    if(scenario.id==='ports') {assert.equal(new Set(events.map(e=>e.port)).size,10);assert.ok(events.every(e=>e.protocol==='TCP'));}
    if(scenario.id==='exfil') assert.equal(events.reduce((n,e)=>n+e.bytes,0),144000000);
  }
  assert.equal(engine.state.events.filter(e=>e.sourceIp===stopped.device.ip&&e.origin==='Portal simulation').length,stop.simulation.index);
  assert.equal((await post('/api/portal',{action:'demo-sequence',scenario:'api'},stopped.token)).status,202);
  engine.tick(Date.now()+20000);
  const contained=devices.find(d=>d.scenario.id==='privilege');
  const alert=engine.state.alerts.find(a=>a.sourceIp===contained.device.ip&&a.rule==='privilege');
  engine.decide(alert.id,'approve');
  assert.equal((await post('/api/portal',{action:'demo-sequence',scenario:'files'},contained.token)).status,403);
  assert.equal((await(await post('/api/portal',{action:'heartbeat'},stopped.token)).json()).demo.id,'api');
});

test('LAN QR and test-device simulation use registered sessions and preserve the approval gate', { timeout: 16000 }, async t => {
  const { server, engine } = createLabServer({ seed: false, lan: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, token) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Device-Token': token } : {}) }, body: JSON.stringify(body) });
  const config = await (await fetch(base + '/api/config')).json();
  assert.equal(config.mode, 'Private LAN');
  if (config.portalUrls.length) {
    const qr = await fetch(base + '/api/join-qr.svg?index=0');
    assert.equal(qr.status, 200); assert.match(qr.headers.get('content-type'), /image\/svg\+xml/); assert.match(await qr.text(), /<svg/);
  }
  assert.equal((await fetch(base + '/api/join-qr.svg?index=-1')).status, 404);
  const employee = await (await post('/api/register', { hostname: 'QA-EMPLOYEE', role: 'Employee Device', os: 'iOS' })).json();
  assert.equal((await post('/api/portal', { action: 'demo-sequence' }, employee.token)).status, 403);
  const device = await (await post('/api/register', { hostname: 'QA-TEST-DEVICE', role: 'Test Device', os: 'Android' })).json();
  assert.equal((await post('/api/portal', { action: 'demo-sequence' }, device.token)).status, 202);
  assert.equal((await post('/api/portal', { action: 'demo-sequence' }, device.token)).status, 409);
  const heartbeat = await (await post('/api/portal', { action: 'heartbeat' }, device.token)).json();
  assert.equal(heartbeat.blocked, false); assert.equal(heartbeat.demo.total, 9);
  await new Promise(resolve => setTimeout(resolve, 9400));
  const events = engine.state.events.filter(e => e.sourceIp === device.device.ip && e.origin === 'Portal simulation');
  assert.equal(events.length, 9);
  assert.equal(events.filter(e => e.eventType === 'LOGIN_FAILED').length, 6);
  assert.ok(events.every(e => e.truth === 'malicious'));
  // A generated successful-login record must never authenticate the browser.
  assert.equal((await post('/api/portal', { action: 'admin' }, device.token)).status, 401);
  const alert = engine.state.alerts.find(a => a.rule === 'compromise' && a.sourceIp === device.device.ip);
  assert.ok(alert); assert.equal(engine.state.blocked.length, 0);
  engine.tick(Date.now() + 20000);
  assert.equal((await post('/api/action', { name: 'decision', payload: { id: alert.id, decision: 'approve' } })).status, 200);
  assert.equal((await (await post('/api/portal', { action: 'heartbeat' }, device.token)).json()).blocked, true);
  assert.equal((await post('/api/portal', { action: 'probe' }, device.token)).status, 403);
  assert.equal((await post('/api/portal', { action: 'probe' }, employee.token)).status, 200);
});
test('intentional portal activity reaches the shared SOC and obeys approved containment', async t => {
  const { server, engine } = createLabServer({ seed: false }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, token) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Device-Token': token } : {}) }, body: JSON.stringify(body) });
  const registration = await (await post('/api/register', { hostname: 'TEST-PHONE-02', role: 'Test Device', os: 'Android' })).json();
  assert.ok(registration.token); assert.equal(registration.device.synthetic, false);
  for (let i = 0; i < 6; i++) assert.equal((await post('/api/portal', { action: 'login', username: 'admin', password: 'wrong-demo' }, registration.token)).status, 401);
  assert.equal((await post('/api/portal', { action: 'login', username: 'admin', password: 'secureadmin' }, registration.token)).status, 200);
  assert.equal((await post('/api/portal', { action: 'admin' }, registration.token)).status, 200);
  assert.equal(engine.state.events[0].protocol, 'HTTP'); assert.equal(engine.state.events[0].port, server.address().port);
  const alert = engine.state.alerts.find(a => a.rule === 'compromise'); assert.ok(alert); assert.equal(alert.truth, 'unlabeled');
  engine.tick(Date.now() + 20000);
  assert.equal((await post('/api/action', { name: 'decision', payload: { id: alert.id, decision: 'approve' } })).status, 200);
  const blocked = await post('/api/portal', { action: 'dashboard' }, registration.token); assert.equal(blocked.status, 403); assert.match((await blocked.json()).error, /Blocked/);
  assert.equal(engine.state.events[0].action, 'Blocked');
  assert.equal((await post('/api/portal', { action: 'dashboard' }, 'invalid-token')).status, 401);
  assert.equal((await fetch(base + '/api/action', { method: 'POST', headers: { Origin: 'https://external.example', 'Content-Type': 'application/json' }, body: '{"name":"reset"}' })).status, 403);
  assert.equal((await fetch(base + '/server.js')).status, 404);
  assert.equal((await fetch(base + '/package.json')).status, 404);
  for (const route of ['/', '/employee.html', '/device', '/js/app.js', '/css/style.css']) assert.equal((await fetch(base + route)).status, 200, route);
  await post('/api/action', { name: 'reset' }); assert.equal((await post('/api/portal', { action: 'login', username: 'admin', password: 'secureadmin' }, registration.token)).status, 401);
  assert.equal((await post('/api/shutdown', {})).status, 200);
});
