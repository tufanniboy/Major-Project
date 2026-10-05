import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { SOCEngine } from '../js/simulation.js';
import { createLabServer } from '../server.js';
import { createLLMProvider, buildEvidence, validateAnswer } from '../lib/llm-provider.js';
import { llmPanel } from '../js/llm-panel.js';
import { captureLab } from '../lib/lab-snapshot.js';

function evidence(engine = new SOCEngine({ seed: false })) {
  for (let i = 0; i < 5; i++) engine.ingest({ sourceIp:'192.168.1.8', destinationIp:'192.168.1.25', user:'admin', eventType:'LOGIN_FAILED' });
  const alert = engine.state.alerts.find(a => a.rule === 'failures');
  engine.finishAnalysis(alert, Date.now());
  return { engine, alert, bundle:buildEvidence(alert,engine.state.events,engine.device(alert.sourceIp)) };
}
const answer = bundle => ({ assessment:'Needs review', summary:'Repeated authentication failures need owner verification.',
  evidence:[{eventId:bundle.events[0].id,explanation:'Authentication failed.'}], techniques:[], recommendations:['Verify the account owner.'], limitations:['These are controlled lab records.'] });

test('OpenAI request uses structured output, server-only key and a bounded evidence whitelist', async () => {
  const { bundle } = evidence();
  assert.equal(JSON.stringify(bundle).includes('True positive'),false);
  assert.equal('truth' in bundle.events[0],false);
  let request;
  const provider = createLLMProvider({LLM_PROVIDER:'openai',LLM_MODEL:'test-model',OPENAI_API_KEY:'test-private-key'}, {fetchImpl:async (url,opts)=>{
    request={url,...opts}; return Response.json({status:'completed',model:'test-model-version',output:[{content:[{type:'output_text',text:JSON.stringify(answer(bundle))}]}]});
  }});
  const result = await provider.analyze(bundle);
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.headers.Authorization,'Bearer test-private-key');
  const payload=JSON.parse(request.body);
  assert.equal(payload.store,false); assert.equal(payload.text.format.strict,true);
  assert.equal(payload.text.format.type,'json_schema');
  assert.equal(JSON.stringify(provider.descriptor).includes('test-private-key'),false);
  assert.equal(result.model,'test-model-version');
  assert.deepEqual(result.answer,answer(bundle));
});

test('Ollama uses non-streaming schema output and rejects invented evidence', async () => {
  const { bundle }=evidence();
  let request;
  const provider=createLLMProvider({LLM_PROVIDER:'ollama',LLM_MODEL:'local-test'}, {fetchImpl:async(url,opts)=>{
    request={url,...opts};return Response.json({done:true,model:'local-test',message:{content:JSON.stringify(answer(bundle))}});
  }});
  await provider.analyze(bundle);
  assert.equal(request.url,'http://127.0.0.1:11434/api/chat');
  assert.equal(JSON.parse(request.body).stream,false);
  assert.equal(request.headers.Authorization,undefined);
  const invented=answer(bundle); invented.evidence[0].eventId='EVT-NOT-SENT';
  assert.throws(()=>validateAnswer(invented,bundle),/unsupported evidence/);
  assert.equal(createLLMProvider({LLM_PROVIDER:'ollama',LLM_MODEL:'test',OLLAMA_BASE_URL:'http://public.example'}).descriptor.configured,false);
});

test('missing setup, upstream errors, refused and incomplete answers never become simulated LLM output', async () => {
  const { bundle }=evidence();
  assert.equal(createLLMProvider({}).descriptor.configured,false);
  assert.equal(createLLMProvider({LLM_PROVIDER:'openai',LLM_MODEL:'test'}).descriptor.configured,false);
  for (const response of [new Response('private provider diagnostics',{status:401}), Response.json({status:'incomplete',model:'test'}), Response.json({status:'completed',model:'test',output:[{content:[{type:'refusal',refusal:'No answer'}]}]})]) {
    const provider=createLLMProvider({LLM_PROVIDER:'openai',LLM_MODEL:'test',OPENAI_API_KEY:'secret'}, {fetchImpl:async()=>response});
    await assert.rejects(provider.analyze(bundle), error => !error.message.includes('private') && !error.message.includes('secret'));
  }
});

async function labFixture(t, analyze, extra={}) {
  const llm={descriptor:{configured:true,provider:'ollama',model:'test-model'},analyze};
  const lab=createLabServer({llm,llmCooldownMs:0,...extra}); await lab.ready;
  await new Promise(resolve=>lab.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{lab.stop();await lab.closed;});
  const base=`http://127.0.0.1:${lab.server.address().port}`;
  const post=(route,body,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  return {...lab,base,post};
}
async function waitFor(check) {
  for(let i=0;i<100;i++){if(check())return;await delay(10);}
  assert.fail('Expected background model job to finish');
}

test('model jobs leave HTTP responsive, save answers and never execute containment',async t=>{
  let resolveModel, saved;
  const storage={async load(initial){return initial;},async save(snapshot){saved=structuredClone(snapshot);},async close(){}};
  const lab=await labFixture(t,()=>new Promise(resolve=>{resolveModel=resolve;}),{storage});
  const {alert,bundle}=evidence(lab.engine);
  assert.equal((await lab.post('/api/llm/analyze',{id:alert.id})).status,202);
  assert.equal((await fetch(lab.base+'/api/state')).status,200,'Model I/O must not hold the HTTP queue');
  assert.equal((await lab.post('/api/llm/analyze',{id:alert.id})).status,429);
  resolveModel({answer:answer(bundle),provider:'ollama',model:'test-model',fallbackUsed:true,attempts:[{provider:'gemini',status:'Failed',reason:'Provider quota or rate limit reached.'},{provider:'ollama',status:'Answered'}]});
  await waitFor(()=>saved?.state.alerts.find(a=>a.id===alert.id)?.llm?.status==='Complete');
  assert.deepEqual(lab.engine.state.blocked,[]);
  assert.equal(lab.engine.state.responses.length,0);
  assert.equal(alert.llm.eventIds.length,5);
  assert.equal(saved.state.alerts.find(a=>a.id===alert.id).llm.attempts.length,2);
  assert.equal(alert.llm.fallbackUsed,true);
  assert.equal((await lab.post('/api/llm/analyze',{id:alert.id})).status,200,'Reuse completed evidence without another provider charge');
  assert.ok(alert.llm.durationSeconds>=0);
});

test('new evidence and resets discard in-flight model answers',async t=>{
  let resolveModel;
  const lab=await labFixture(t,()=>new Promise(resolve=>{resolveModel=resolve;}));
  const {alert,bundle}=evidence(lab.engine);
  await lab.post('/api/llm/analyze',{id:alert.id});
  lab.engine.ingest({sourceIp:'192.168.1.8',destinationIp:'192.168.1.25',user:'admin',eventType:'LOGIN_FAILED'});
  resolveModel({answer:answer(bundle),provider:'ollama',model:'test-model'});
  await delay(30);
  assert.equal(alert.llm.status,'Stale'); assert.equal(alert.llm.answer,null);
  lab.engine.finishAnalysis(alert,Date.now());
  assert.equal((await lab.post('/api/llm/analyze',{id:alert.id})).status,202);
  await lab.post('/api/action',{name:'reset'});
  resolveModel({answer:answer(bundle),provider:'ollama',model:'test-model'});
  await delay(30);
  assert.equal(lab.engine.state.alerts.length,0);
});

test('LLM endpoint requires hosted analyst authentication and rejects missing setup',async t=>{
  const lab=await labFixture(t,async()=>{assert.fail('Unauthorized model call');},{hosted:true,password:'test-password-long',joinCode:'test-invitation-long-123456789',publicUrl:'https://soc.example.test'});
  assert.equal((await lab.post('/api/llm/analyze',{id:'SOC-841'})).status,401);
  assert.equal((await lab.post('/api/llm/analyze',{id:'SOC-841'},{Origin:'https://attacker.test'})).status,403);
  const local=await labFixture(t,null,{llm:createLLMProvider({})});
  assert.equal((await local.post('/api/llm/analyze',{id:'SOC-841'})).status,409);
});

test('model output is escaped in the investigation panel',()=>{
  const {alert,bundle}=evidence();
  const result=answer(bundle); result.summary='<img src=x onerror=alert(1)>';
  alert.llm={status:'Complete',provider:'ollama',model:'test-model',answer:result,durationSeconds:1,completedAt:new Date().toISOString(),eventIds:alert.eventIds};
  const html=llmPanel(alert,{llm:{configured:true},control:true});
  assert.match(html,/&lt;img/); assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/LLM answer received/);
});

test('a saved unfinished model request is marked interrupted on backend recovery',async t=>{
  const {engine,alert}=evidence();
  alert.llm={requestId:'old-request',status:'Running',model:'test-model'};
  let saved=captureLab(engine,new Map());
  const storage={async load(){return structuredClone(saved);},async save(value){saved=structuredClone(value);},async close(){}};
  const lab=await labFixture(t,async()=>{assert.fail('Restart must not automatically bill another model request');},{storage});
  assert.equal(lab.engine.state.alerts[0].llm.status,'Interrupted');
  assert.equal(saved.state.alerts[0].llm.status,'Interrupted');
});
