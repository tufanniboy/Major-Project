import test from 'node:test';
import assert from 'node:assert/strict';
import { createLLMProvider } from '../lib/llm-provider.js';
import { llmPanel } from '../js/llm-panel.js';

const bundle = { alert:{candidateTechniques:[]}, events:[{id:'EVT-1',eventType:'LOGIN_FAILED'}] };
const answer = {assessment:'Needs review',summary:'A login failed.',evidence:[{eventId:'EVT-1',explanation:'Authentication failed.'}],techniques:[],recommendations:['Check with the owner.'],limitations:['One lab event only.']};
const settings = {LLM_PROVIDER:'auto',GEMINI_MODEL:'gemini-test',GEMINI_API_KEY:'gemini-private',OPENAI_MODEL:'openai-test',OPENAI_API_KEY:'openai-private',OLLAMA_MODEL:'local-test'};
function success(provider) {
  if (provider === 'gemini') return Response.json({modelVersion:'gemini-version',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer)}]}}]});
  if (provider === 'openai') return Response.json({status:'completed',model:'openai-version',output:[{content:[{type:'output_text',text:JSON.stringify(answer)}]}]});
  return Response.json({done:true,model:'local-test',message:{content:JSON.stringify(answer)}});
}

test('Gemini adapter keeps key in header and validates structured output and citations', async()=>{
  let captured;
  const model=createLLMProvider({...settings,LLM_PROVIDER:'gemini',LLM_MODEL:'gemini-test'}, {fetchImpl:async(url,opts)=>{captured={url,...opts};return success('gemini');}});
  const result=await model.analyze(bundle);
  assert.equal(captured.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.equal(captured.headers['x-goog-api-key'],'gemini-private');
  assert.equal(JSON.parse(captured.body).generationConfig.responseMimeType,'application/json');
  assert.equal(JSON.parse(captured.body).generationConfig.responseJsonSchema.type,'object');
  assert.equal(captured.body.includes('gemini-private'),false);
  assert.equal(JSON.stringify(model.descriptor).includes('private'),false);
  assert.deepEqual(result.answer,answer); assert.equal(result.model,'gemini-version');
});

test('429 then 503 switches to Ollama, honors Retry-After and later recovers primary',async()=>{
  let clock=100000, calls=[], healthy=false;
  const model=createLLMProvider(settings,{now:()=>clock,fetchImpl:async(url)=>{
    calls.push(url);
    if(url.includes('googleapis')) return healthy?success('gemini'):new Response('SECRET',{status:429,headers:{'Retry-After':'120'}});
    if(url.includes('openai')) return new Response('SECRET',{status:503});
    return success('ollama');
  }});
  const first=await model.analyze(bundle);
  assert.equal(first.provider,'ollama'); assert.equal(first.fallbackUsed,true); assert.equal(calls.length,3);
  assert.deepEqual(first.attempts.map(a=>a.code||a.status),['rate_limit','unavailable','Answered']);
  assert.equal(JSON.stringify(first).includes('SECRET'),false);
  assert.equal(model.descriptor.providers[0].status,'Cooling down');
  calls=[]; const second=await model.analyze(bundle);
  assert.equal(calls.length,1); assert.equal(second.attempts[0].status,'Cooling down');
  clock+=121000;healthy=true;calls=[];
  const third=await model.analyze(bundle);
  assert.equal(third.provider,'gemini');assert.equal(third.fallbackUsed,false);assert.equal(calls.length,1);
});

test('access failures fall back without leaking upstream diagnostics or keys',async()=>{
  const model=createLLMProvider(settings,{fetchImpl:async url=>url.includes('googleapis')?new Response('gemini-private raw error',{status:403}):success('openai')});
  const result=await model.analyze(bundle);
  assert.equal(result.provider,'openai');assert.equal(result.attempts[0].code,'access_denied');
  assert.doesNotMatch(JSON.stringify(result),/gemini-private|raw error/);
});

test('network failures and timeouts try the next provider once',async()=>{
  let calls=0;
  const model=createLLMProvider(settings,{fetchImpl:async()=>{
    calls++;
    if(calls===1) throw new TypeError('private network diagnostics');
    if(calls===2) throw new DOMException('timed out','TimeoutError');
    return success('ollama');
  }});
  const result=await model.analyze(bundle);
  assert.equal(calls,3);assert.equal(result.provider,'ollama');
  assert.deepEqual(result.attempts.map(a=>a.code||a.status),['connection','timeout','Answered']);
});

test('caller cancellation stops the chain immediately, including before a request',async()=>{
  const controller=new AbortController();let calls=0;
  const model=createLLMProvider(settings,{fetchImpl:async()=>{calls++;controller.abort();throw new DOMException('aborted','AbortError');}});
  await assert.rejects(model.analyze(bundle,controller.signal),/cancelled/);assert.equal(calls,1);
  await assert.rejects(model.analyze(bundle,controller.signal),/cancelled/);assert.equal(calls,1);
});

test('refusals and fabricated evidence stop instead of seeking a more permissive answer',async()=>{
  for(const response of [
    {modelVersion:'gemini-test',promptFeedback:{blockReason:'SAFETY'}},
    {modelVersion:'gemini-test',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...answer,evidence:[{eventId:'INVENTED',explanation:'Not supplied.'}]})}]}}]}
  ]) {
    let calls=0;
    const model=createLLMProvider(settings,{fetchImpl:async()=>{calls++;return Response.json(response);}});
    await assert.rejects(model.analyze(bundle),error=>error.attempts.length===1);
    assert.equal(calls,1);
  }
});

test('all providers unavailable returns actionable attempts; cooldown avoids repeated requests',async()=>{
  let calls=0;
  const model=createLLMProvider(settings,{fetchImpl:async()=>{calls++;return new Response('sensitive diagnostics',{status:429});}});
  await assert.rejects(model.analyze(bundle),e=>e.attempts.length===3&&!e.message.includes('sensitive'));
  assert.equal(calls,3);
  await assert.rejects(model.analyze(bundle),e=>e.attempts.every(a=>a.status==='Cooling down'));
  assert.equal(calls,3);
});

test('missing credentials are skipped and invalid order is not silently accepted',async()=>{
  let calls=0;
  const model=createLLMProvider({...settings,GEMINI_API_KEY:'',OPENAI_API_KEY:''},{fetchImpl:async url=>{calls++;assert.match(url,/127\.0\.0\.1/);return success('ollama');}});
  const result=await model.analyze(bundle);assert.equal(calls,1);assert.equal(result.attempts[0].status,'Skipped');
  for(const order of ['gemini,unknown','openai,openai']) assert.equal(createLLMProvider({...settings,LLM_PROVIDERS:order}).descriptor.configured,false);
});

test('HTTP-date Retry-After postpones only the affected provider',async()=>{
  const clock=Date.parse('2026-09-03T00:00:00Z');
  const model=createLLMProvider(settings,{now:()=>clock,fetchImpl:async url=>url.includes('googleapis')?new Response('',{status:429,headers:{'Retry-After':new Date(clock+180000).toUTCString()}}):success('openai')});
  await model.analyze(bundle);
  assert.equal(model.descriptor.providers[0].retryAt,new Date(clock+180000).toISOString());
  assert.equal(model.descriptor.providers[1].status,'Ready to try');
});

test('fallback status and provider attempts render escaped text',()=>{
  const html=llmPanel({id:'TEST',analysis:{},llm:{status:'Failed',error:'Unavailable',attempts:[{provider:'<svg onload=x>',status:'Failed',reason:'<script>bad</script>'}]}},{control:true,llm:{configured:true,provider:'auto',model:'Automatic fallback',providers:[{provider:'gemini',model:'<img src=x>',status:'Ready to try'}]}});
  assert.match(html,/Provider attempts/);assert.match(html,/Model fallback order/);
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<svg onload|<img src=x>/);
});
