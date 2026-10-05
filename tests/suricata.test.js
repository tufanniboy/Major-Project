import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabServer } from '../server.js';
import { normalizeSuricata, normalizeSuricataBatch, validSensorToken } from '../lib/suricata.js';
import { captureLab, restoreLab } from '../lib/lab-snapshot.js';
import { SOCEngine } from '../js/simulation.js';

const token='test-suricata-token-with-at-least-32-characters';
const sample=(overrides={})=>({
  timestamp:new Date().toISOString(),flow_id:923456,event_type:'alert',src_ip:'192.168.56.10',src_port:44000,
  dest_ip:'192.168.56.20',dest_port:80,proto:'TCP',app_proto:'http',flow:{bytes_toserver:812},
  alert:{signature_id:1000001,signature:'LAB ICMP test',category:'Attempted Information Leak',severity:2},...overrides
});

test('Suricata normalizer accepts bounded private-lab alerts and rejects unsafe input',()=>{
  const event=normalizeSuricata(sample());
  assert.equal(event.sourceIp,'192.168.56.10'); assert.equal(event.destinationIp,'192.168.56.20');
  assert.equal(event.origin,'Suricata EVE sensor'); assert.equal(event.risk,'high'); assert.equal(event.eventType,'NETWORK_ALERT');
  assert.equal(event.sensorAlert.signatureId,1000001); assert.match(event.sensorAlert.sourceEventId,/^[a-f0-9]{64}$/);
  assert.equal(normalizeSuricata({event_type:'flow'}),null);
  assert.throws(()=>normalizeSuricata(sample({src_ip:'8.8.8.8'})),/private IPv4/);
  assert.throws(()=>normalizeSuricataBatch(Array.from({length:101},()=>sample())),/between 1 and 100/);
  const cleaned=normalizeSuricata(sample({alert:{signature_id:2,signature:'bad\nname',category:'cat',severity:99}}));
  assert.equal(cleaned.sensorAlert.signature,'bad name'); assert.equal(cleaned.risk,'medium');
  assert.equal(validSensorToken(token,`Bearer ${token}`),true); assert.equal(validSensorToken(token,'Bearer wrong'),false);
});

test('authenticated Suricata ingestion creates reviewable real-time evidence and deduplicates it',async t=>{
  const {server,engine}=createLabServer({seed:false,sensorToken:token});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(payload,authorization=`Bearer ${token}`)=>fetch(base+'/api/sensors/suricata',{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(payload)});
  const record=sample();
  assert.equal((await post(record,'Bearer wrong')).status,401);
  const result=await (await post([{event_type:'flow'},record])).json();
  assert.deepEqual(result,{accepted:1,duplicates:0,ignored:1});
  const event=engine.state.events[0];
  assert.equal(event.origin,'Suricata EVE sensor'); assert.equal(event.signature,'LAB ICMP test'); assert.equal(event.sensor,'Suricata');
  assert.equal(engine.device('192.168.56.10').sensorManaged,true); assert.equal(engine.state.sensor.received,1);
  const alert=engine.state.alerts.find(item=>item.rule==='SURICATA-1000001'); assert.ok(alert); assert.deepEqual(alert.eventIds,[event.id]);
  const replay=await (await post(record)).json(); assert.deepEqual(replay,{accepted:0,duplicates:1,ignored:0});
  engine.tick(Date.now()+10000); assert.equal(alert.analysis.classification,'Needs review'); assert.match(alert.analysis.caveat,/not proof/);
  const config=await (await fetch(base+'/api/config')).json();
  assert.equal(config.sensor.configured,true); assert.equal(config.sensor.received,1); assert.equal(JSON.stringify(config).includes(token),false);
  const state=await (await fetch(base+'/api/state')).json(); assert.equal(state.events[0].signature,'LAB ICMP test');
  const before=engine.state.events.length;
  const publicAlert=await post(sample({src_ip:'203.0.113.4'})); assert.equal(publicAlert.status,400); assert.equal(engine.state.events.length,before);
});

test('sensor state and deduplication fields survive a saved lab checkpoint',()=>{
  const engine=new SOCEngine({seed:false});
  const input=normalizeSuricata(sample()); engine.observe({ip:input.sourceIp,hostname:input.hostname}); engine.ingest(input);
  const snapshot=captureLab(engine,new Map()), restored=new SOCEngine({seed:false});
  restoreLab(restored,new Map(),snapshot);
  assert.equal(restored.state.sensor.received,1); assert.equal(restored.state.events[0].sourceEventId,input.sensorAlert.sourceEventId);
  assert.equal(restored.state.devices.find(device=>device.ip===input.sourceIp).sensorManaged,true);
});

test('sensor endpoint is explicitly disabled without a backend token',async t=>{
  const {server}=createLabServer({seed:false}); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/sensors/suricata`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(sample())});
  assert.equal(response.status,503);
  assert.throws(()=>createLabServer({sensorToken:'short'}),/at least 32/);
});
