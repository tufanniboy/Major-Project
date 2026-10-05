import test from 'node:test';
import assert from 'node:assert/strict';
import { networkActivity, trafficRoute, network } from '../js/network.js';
import { SOCEngine } from '../js/simulation.js';

test('network activity represents concurrent current sources and never animates old fixtures',()=>{
  const now=Date.now();
  const event=(sourceIp,age,extras={})=>({sourceIp,timestamp:new Date(now-age).toISOString(),risk:'low',action:'Allowed',...extras});
  const state={events:[event('a',100),event('a',500),event('b',200,{risk:'high'}),event('c',300,{action:'Blocked'}),event('d',6100),event('e',0,{fixture:true}),event('f',-1000)]};
  assert.deepEqual(networkActivity(state,now).map(e=>[e.sourceIp,e.tone]),[['a','normal'],['b','suspicious'],['c','blocked']]);
  assert.equal(networkActivity(state,now+7100).length,0);
});
test('blocked traffic stops before policy and registration routes to the collector',()=>{
  assert.equal(trafficRoute(179,'192.168.1.25',true),'M250 179H315V95H363');
  assert.equal(trafficRoute(179,'192.168.1.5'),'M250 179H315V215H375');
  assert.match(trafficRoute(179,'192.168.1.25'),/V205H640$/);
});
test('active devices beyond the initial display limit appear in the topology',()=>{
  const engine=new SOCEngine({seed:false});
  for(let i=40;i<48;i++)engine.register({hostname:`DEVICE-${i}`,ip:`192.168.1.${i}`,role:'Test Device',os:'Android'});
  engine.state.events=[];
  engine.ingest({sourceIp:'192.168.1.47',destinationIp:'192.168.1.20',eventType:'API_DENIED'});
  const output=network(engine.state,true);
  assert.match(output,/data-node="192.168.1.47"/);
  assert.match(output,/class="network-flow suspicious"/);
  assert.match(output,/<animateMotion/);
  engine.state.blocked.push('192.168.1.47');
  engine.state.events=[];
  engine.ingest({sourceIp:'192.168.1.47',destinationIp:'192.168.1.20',eventType:'PAGE_ACCESS'});
  const blocked=network(engine.state,true);
  assert.match(blocked,/class="network-flow blocked"/);
  assert.match(blocked,/class="policy-stop"/);
  assert.doesNotMatch(blocked,/class="telemetry-line" d="M595/,'Blocked requests must not show service-side telemetry');
});
