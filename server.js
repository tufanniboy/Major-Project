import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { SOCEngine, isPrivateIp } from './js/simulation.js';
import QRCode from 'qrcode';
import { deviceScenarios, deviceScenarioEvent } from './js/device-scenarios.js';
import { createHostedAuth } from './lib/hosted-auth.js';
import { PostgresStore } from './lib/postgres-store.js';
import { captureLab, restoreLab } from './lib/lab-snapshot.js';
import { createLLMProvider, buildEvidence } from './lib/llm-provider.js';
import { loadConfig } from './lib/config.js';
import { validSensorToken } from './lib/sensor-auth.js';
import { normalizeWindowsBatch } from './lib/windows-events.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
export function createLabServer({ seed = false, lan = false, hosted = false, password, joinCode, publicUrl, sensorToken = '', storage = null, llm = createLLMProvider({}), llmCooldownMs = 5000 } = {}) {
  if (sensorToken && sensorToken.length < 32) throw new Error('SENSOR_INGEST_TOKEN must contain at least 32 characters.');
  const auth = hosted ? createHostedAuth({password,joinCode,publicUrl}) : null;
  const engine = new SOCEngine({ seed }), clients = new Set(), registrations = new Map();
  let modelJob = null, lastModelRequest = 0;
  const sensorLimits = new Map();
  const local = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  const operator = req => hosted ? auth.authorized(req) : local(req);
  const reply = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const tokenHash = token => createHash('sha256').update(String(token || '')).digest('hex');
  let initialized = !storage, storageFailure = false, lastSaved = null, work = Promise.resolve(), closing = false;
  const databaseError = () => Object.assign(new Error('PostgreSQL is unavailable or this lab changed on another server. Restart the backend after checking the database. No unsaved changes were accepted.'), { code: 'SOC_DATABASE' });
  const ready = storage ? (async () => {
    const snapshot = await storage.load(captureLab(engine, registrations));
    restoreLab(engine, registrations, snapshot);
    let interrupted = false;
    for (const alert of engine.state.alerts) if (alert.llm?.status === 'Running') {
      alert.llm.status = 'Interrupted'; alert.llm.error = 'The backend restarted. Ask the model again.'; interrupted = true;
    }
    if (interrupted) await storage.save(captureLab(engine, registrations));
    lastSaved = captureLab(engine, registrations);
    initialized = true;
  })() : Promise.resolve();
  // Attach immediately: callers still receive the original rejection via ready.
  ready.catch(() => { storageFailure = true; });
  const enqueue = operation => { const job = work.then(operation); work = job.catch(() => {}); return job; };
  const persist = async () => {
    if (!storage) return;
    try {
      const snapshot = captureLab(engine, registrations);
      await storage.save(snapshot);
      lastSaved = snapshot;
    } catch {
      storageFailure = true;
      restoreLab(engine, registrations, lastSaved);
      for (const client of clients) client.end();
      clients.clear();
      throw databaseError();
    }
  };
  const publish = async () => {
    await persist();
    const data = `data: ${JSON.stringify(engine.state)}\n\n`;
    for (const res of clients) res.write(data);
  };
  const startModelJob = (alert, bundle, requestId) => {
    const controller = new AbortController(), generation = engine.state.generation;
    const job = { controller, requestId }; modelJob = job;
    const started = Date.now();
    // Model I/O stays outside the state queue, so phones and SSE remain responsive.
    void (async () => {
      let result, error, attempts;
      try { result = await llm.analyze(bundle, controller.signal); }
      catch (failure) { error = failure.message; attempts = failure.attempts; }
      await enqueue(async () => {
        if (closing || storageFailure || engine.state.generation !== generation) return;
        const current = engine.state.alerts.find(a => a.id === alert.id);
        if (current?.llm?.requestId !== requestId || current.llm.status !== 'Running') return;
        current.llm = { ...current.llm, status: error ? 'Failed' : 'Complete', error: error || null,
          ...(attempts ? { attempts } : {}),
          ...(result || {}), completedAt: new Date().toISOString(), durationSeconds: (Date.now() - started) / 1000 };
        engine.state.revision++; await publish();
      });
    })().catch(() => { console.error('Could not save the model result. Check backend storage.'); }).finally(() => { if (modelJob === job) modelJob = null; });
  };
  const body = async (req, maxBytes = 8192) => { let data = '', bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > maxBytes) throw new Error('Request is too large.'); data += chunk; } return JSON.parse(data || '{}'); };
  const handle = async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', hosted ? 'no-referrer' : 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const remote = (req.socket.remoteAddress || '').replace('::ffff:', '');
      if (!hosted && !local(req) && (!lan || !isPrivateIp(remote))) return reply(res, 403, { error: 'Only local or private lab connections are permitted.' });
      const url = new URL(req.url, 'http://localhost');
      if (req.headers.origin && req.headers.origin !== (hosted ? auth.origin : `http://${req.headers.host}`)) return reply(res, 403, { error: 'Cross-origin requests are not allowed.' });
      if (url.pathname === '/api/health') return reply(res,storageFailure?503:200,{ok:!storageFailure,storage:storage?'PostgreSQL':'Memory',windowsLogsConfigured:Boolean(sensorToken)});
      if (url.pathname === '/api/auth/login' && req.method === 'POST' && hosted) {
        const input=await body(req), result=auth.login(input.password,remote);
        if(result.cookie) res.setHeader('Set-Cookie',result.cookie);
        return reply(res,result.status,result.error?{error:result.error}:{ok:true});
      }
      if (url.pathname === '/api/auth/logout' && req.method === 'POST' && hosted) {
        res.setHeader('Set-Cookie',auth.logout(req));
        for(const client of clients) if(!auth.valid(client.analystToken)) {client.end();clients.delete(client);}
        res.writeHead(303,{Location:'/analyst-login.html'});res.end();return;
      }
      if (hosted && ['/', '/index.html'].includes(url.pathname) && !operator(req)) {res.writeHead(302,{Location:'/analyst-login.html'});res.end();return;}
      if (hosted && ['/api/state','/api/stream','/api/action','/api/join-qr.svg'].includes(url.pathname) && !operator(req)) return reply(res,401,{error:'Sign in as an analyst to open the SOC console.'});
      if (url.pathname === '/api/config') return reply(res, 200, { mode: hosted ? 'Hosted lab' : lan ? 'Private LAN' : 'Local lab', control: operator(req), portalUrls: hosted ? operator(req) ? [auth.portalUrl] : [] : labUrls(server.address()?.port || 8000), engine: 'Windows Security log collection, controlled lab scenarios, and optional LLM review', storage:storage?'PostgreSQL':'Memory', sensor:{configured:Boolean(sensorToken),type:'Windows Event Log',received:engine.state.sensor?.received||0,lastSeen:engine.state.sensor?.lastSeen||null}, llm: llm.descriptor });
      if (storageFailure && url.pathname.startsWith('/api/') && url.pathname !== '/api/shutdown') throw databaseError();
      if (url.pathname === '/api/sensors/windows' && req.method === 'POST') {
        if (!sensorToken) return reply(res,503,{error:'Windows log ingestion is not configured. Set SENSOR_INGEST_TOKEN on the backend.'});
        if (!validSensorToken(sensorToken,req.headers.authorization)) return reply(res,401,{error:'A valid sensor bearer token is required.'});
        const current=Date.now(), previous=sensorLimits.get(remote);
        if(!previous||current-previous.started>=60000) sensorLimits.set(remote,{started:current,count:1});
        else if(++previous.count>120) return reply(res,429,{error:'Sensor request limit reached. Batch records and retry shortly.'});
        const normalized=normalizeWindowsBatch(await body(req,524288),current);
        const known=new Set([...(engine.state.sensor?.recentIds||[]),...engine.state.events.map(event=>event.sourceEventId).filter(Boolean)]);
        let duplicates=0;
        for(const event of normalized.events) {
          if(known.has(event.sourceEventId)) {duplicates++;continue;}
          known.add(event.sourceEventId);
          if(!engine.device(event.sourceIp)) engine.observe({ip:event.sourceIp,hostname:event.hostname});
          if(!engine.device(event.destinationIp)) engine.observe({ip:event.destinationIp,hostname:`WIN-${event.destinationIp.split('.').at(-1)}`});
          engine.ingest(event);
        }
        if(normalized.events.length>duplicates) await publish();
        return reply(res,202,{accepted:normalized.events.length-duplicates,duplicates,ignored:normalized.unsupported.length});
      }
      if (url.pathname === '/api/join-qr.svg') {
        if (!lan && !hosted) return reply(res, 409, {error:'Start the server in LAN mode to connect another device.'});
        const index=Number(url.searchParams.get('index')||0), address=(hosted?[auth.portalUrl]:labUrls(server.address().port))[index];
        if(!Number.isInteger(index)||!address) return reply(res,404,{error:'No private network address available.'});
        const svg=await QRCode.toString(address,{type:'svg',margin:4,errorCorrectionLevel:'M',color:{dark:'#26332c',light:'#ffffff'}});
        res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}); res.end(svg); return;
      }
      if (url.pathname === '/api/shutdown' && req.method === 'POST') {
        if (hosted || !local(req)) return reply(res, 403, { error: 'Stop hosted services through the hosting dashboard.' });
        reply(res, 200, { message: storage ? 'SOC lab server stopped. Lab data remains saved in PostgreSQL.' : 'SOC lab server stopped. In-memory session data has been cleared.' });
        setImmediate(() => { clearInterval(timer); for (const client of clients) client.end(); server.close(); });
        return;
      }
      if (url.pathname === '/api/state') return reply(res, 200, engine.state);
      if (url.pathname === '/api/stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.analystToken=hosted?auth.tokenFor(req):null;
        res.write(`data: ${JSON.stringify(engine.state)}\n\n`); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      if (url.pathname === '/api/llm/analyze' && req.method === 'POST') {
        if (!operator(req)) return reply(res, hosted ? 401 : 403, {error:'Sign in as an analyst to request model analysis.'});
        if (!llm.descriptor.configured) return reply(res,409,{error:llm.descriptor.message});
        const input = await body(req), alert = engine.state.alerts.find(a => a.id === input.id);
        if (!alert) return reply(res,404,{error:'Investigation not found.'});
        if (!alert.analysis) return reply(res,409,{error:'Wait for evidence collection and the rule assessment to finish.'});
        if (alert.llm?.status === 'Complete') return reply(res,200,{ok:true,result:alert.llm});
        if (modelJob || Date.now() - lastModelRequest < llmCooldownMs) return reply(res,429,{error:'A model request is running or was just started. Wait briefly before trying again.'});
        const bundle = buildEvidence(alert, engine.state.events, engine.device(alert.sourceIp));
        if (!bundle.events.length) return reply(res,409,{error:'No retained evidence is available for this alert.'});
        const requestId = randomUUID();
        alert.llm = { requestId, status:'Running', provider:llm.descriptor.provider, model:llm.descriptor.model,
          startedAt:new Date().toISOString(), eventIds:bundle.events.map(e=>e.id), omittedEvidence:bundle.omittedEvidence };
        engine.state.revision++; await publish();
        lastModelRequest = Date.now(); startModelJob(alert,bundle,requestId);
        return reply(res,202,{ok:true});
      }
      if (url.pathname === '/api/action' && req.method === 'POST') {
        if (!operator(req)) return reply(res, 403, { error: 'Analyst controls require authorized console access.' });
        const input = await body(req), result = engine.action(input.name, input.payload);
        if (['reset', 'seed'].includes(input.name)) { registrations.clear(); modelJob?.controller.abort(); }
        await publish(); return reply(res, 200, { ok: true, result });
      }
      if (url.pathname === '/api/register' && req.method === 'POST') {
        const input = await body(req);
        if (hosted && !auth.validInvitation(input.joinCode)) return reply(res,403,{error:'Open the invitation link or scan the QR shared by your analyst to join this lab.'});
        if (registrations.size >= 100) throw new Error('Lab registration limit reached. Reset the environment.');
        // Each portal session receives a private logical address; actual peer IP is retained separately.
        let octet = 40; while (engine.device(`192.168.1.${octet}`)) octet++;
        const device = engine.register({ ...input, ip: `192.168.1.${octet}` }, { synthetic: false });
        device.peerIp = hosted ? 'Hosted session' : remote; device.online=true; const token = randomUUID(); registrations.set(tokenHash(token), { ip: device.ip, peer: remote, user: null, heartbeat:Date.now(), demo:null });
        await publish(); return reply(res, 200, { token, device });
      }
      if (url.pathname === '/api/portal' && req.method === 'POST') {
        const input = await body(req), session = registrations.get(tokenHash(req.headers['x-device-token']));
        if (!session || (!hosted && session.peer !== remote)) return reply(res, 401, { error: 'Register this device again to join the current lab session.' });
        session.heartbeat=Date.now(); const device=engine.device(session.ip); device.online=true;
        if(input.action==='heartbeat') {
          device.lastSeen=new Date().toISOString();
          await persist();
          return reply(res,200,{status:device.status,blocked:engine.state.blocked.includes(session.ip),demo:session.demo ? device.simulation : null,simulation:device.simulation || null});
        }
        const base = { protocol: 'HTTP', port: server.address().port, sourceIp: session.ip, destinationIp: '192.168.1.25', user: session.user || String(input.username || 'employee01').slice(0, 40), origin: 'Lab portal', truth: 'unlabeled' };
        if (engine.state.blocked.includes(session.ip)) { engine.ingest({ ...base, eventType: 'PAGE_ACCESS' }); session.user = null; await publish(); return reply(res, 403, { error: 'Blocked by simulated firewall policy.' }); }
        if (input.action === 'demo-sequence') {
          if(device.role!=='Test Device') return reply(res,403,{error:'Register as a Test Device to run this controlled sequence.'});
          if(session.demo) return reply(res,409,{error:'This device already has a simulation running.'});
          const scenario = deviceScenarios.find(s => s.id === (input.scenario ?? 'compromise'));
          if (!scenario) return reply(res,400,{error:'Choose a supported attack simulation.'});
          session.demo={id:scenario.id,index:0};
          device.simulation={id:scenario.id,name:scenario.name,index:0,total:scenario.count,state:'Running'};
          await publish(); return reply(res,202,{ok:true,simulation:device.simulation});
        }
        if (input.action === 'stop-demo') {
          if (session.demo) { session.demo=null; device.simulation.state='Stopped'; await publish(); }
          return reply(res,200,{ok:true,simulation:device.simulation || null});
        }
        if(input.action==='probe') {engine.ingest({...base,eventType:'HEALTH_CHECK'});await publish();return reply(res,200,{ok:true});}
        if (input.action === 'login') {
          const valid = (input.username === 'employee01' && input.password === 'employee123') || (input.username === 'admin' && input.password === 'secureadmin');
          engine.ingest({ ...base, eventType: 'LOGIN_ATTEMPT' }); engine.ingest({ ...base, eventType: valid ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED' });
          session.user = valid ? input.username : null; await publish(); return reply(res, valid ? 200 : 401, valid ? { ok: true, user: session.user } : { error: 'Incorrect demo username or password. Authentication failure recorded.' });
        }
        if (!session.user) return reply(res, 401, { error: 'Log in with a demo account first.' });
        const types = { dashboard: 'PAGE_ACCESS', profile: 'PROFILE_VIEW', documents: 'FILE_VIEW', admin: 'ADMIN_ACCESS', logout: 'LOGOUT' };
        if (!types[input.action]) throw new Error('Unknown portal action.');
        if (input.action === 'admin' && session.user !== 'admin') return reply(res, 403, { error: 'The admin demo account is required.' });
        engine.ingest({ ...base, destinationIp: input.action === 'admin' ? '192.168.1.25' : '192.168.1.20', eventType: types[input.action] });
        if (input.action === 'logout') session.user = null;
        await publish(); return reply(res, 200, { ok: true });
      }
      if (url.pathname.startsWith('/api/')) return reply(res, 404, { error: 'Endpoint not found.' });
      if (!['GET', 'HEAD'].includes(req.method)) return reply(res, 405, { error: 'Method not allowed.' });
      const relative = url.pathname === '/' ? 'index.html' : url.pathname === '/device' ? 'employee.html' : decodeURIComponent(url.pathname).slice(1);
      if (!/^(index\.html|employee\.html|analyst-login\.html|favicon\.svg|(?:css|js|data)\/[a-zA-Z0-9._/-]+)$/.test(relative)) return reply(res, 404, { error: 'File not found.' });
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep)) return reply(res, 403, { error: 'Invalid path.' });
      const content = await readFile(file); res.writeHead(200, { 'Content-Type': `${mime[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) { reply(res, error.code === 'SOC_DATABASE' ? 503 : error.code === 'ENOENT' ? 404 : 400, { error: error.code === 'ENOENT' ? 'File not found.' : error.message }); }
  };
  const server = http.createServer((req, res) => {
    // Requests and ticks share a queue so no client sees an uncommitted mutation.
    enqueue(async () => {
      try { await ready; await handle(req, res); }
      catch { reply(res,503,{error:'The PostgreSQL backend could not initialize.'}); }
    });
  });
  const tick = async () => {
    if (!initialized || storageFailure || closing || !server.listening) return;
    if(hosted) for(const client of clients) if(!auth.valid(client.analystToken)) {client.end();clients.delete(client);}
    for(const session of registrations.values()) {
      const device=engine.device(session.ip); if(!device) continue;
      device.online=Date.now()-session.heartbeat<20000;
      if(!engine.state.blocked.includes(session.ip)) device.status=device.online?'Connected':'Offline';
      if(session.demo) {
        if (engine.state.blocked.includes(session.ip)) {
          device.simulation.state='Contained'; session.demo=null;
        } else {
          const scenario=deviceScenarios.find(s=>s.id===session.demo.id);
          engine.ingest(deviceScenarioEvent(scenario,session.demo.index,session.ip,server.address().port));
          session.demo.index++; device.simulation.index=session.demo.index;
          if(session.demo.index===scenario.count) { device.simulation.state='Complete'; session.demo=null; }
        }
      }
    }
    engine.tick(); await publish();
  };
  let tickPending = false;
  const timer = setInterval(() => {
    if (tickPending) return;
    tickPending = true;
    enqueue(tick).catch(() => { console.error('Lab updates paused. Check PostgreSQL and restart the backend.'); }).finally(() => { tickPending = false; });
  }, 1000);
  let finishClose;
  const closed = new Promise(resolve => { finishClose = resolve; });
  timer.unref(); server.on('close', () => {
    closing = true; modelJob?.controller.abort(); clearInterval(timer); for (const c of clients) c.end();
    enqueue(async () => { if (storage) await storage.close(); }).catch(() => { console.error('Could not close the PostgreSQL pool cleanly.'); }).finally(finishClose);
  });
  const stop = () => { closing = true; modelJob?.controller.abort(); clearInterval(timer); for (const c of clients) c.end(); server.close(); };
  return { server, engine, ready, closed, stop };
}
function labUrls(port) {
  return Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal && isPrivateIp(i.address)).map(i => `http://${i.address}:${port}/employee.html`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadConfig();
  const lan = process.argv.includes('--lan'), hosted=process.argv.includes('--hosted')||process.env.SOC_HOSTED==='true', port = Number(process.env.PORT || 8000);
  const publicUrl=process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL;
  const databaseUrl = process.env.DATABASE_URL;
  if (hosted && !databaseUrl) throw new Error('Hosted mode requires DATABASE_URL. Connect a PostgreSQL database before starting.');
  const storage = databaseUrl ? new PostgresStore(databaseUrl) : null;
  const llm = createLLMProvider();
  const { server, ready, stop } = createLabServer({lan,hosted,seed:process.argv.includes('--seed'),password:process.env.SOC_ADMIN_PASSWORD,joinCode:process.env.LAB_JOIN_CODE,publicUrl,sensorToken:process.env.SENSOR_INGEST_TOKEN||'',storage,llm});
  try { await ready; }
  catch { if(storage) await storage.close(); console.error('PostgreSQL startup failed. Check DATABASE_URL, database access, TLS settings, and the saved schema. Existing database contents were not reset.'); process.exit(1); }
  console.log(`Storage: ${storage ? 'PostgreSQL (persistent)' : 'Memory (set DATABASE_URL for persistence)'}`);
  console.log(`LLM: ${llm.descriptor.configured ? `${llm.descriptor.provider} / ${llm.descriptor.model} configured; analyst requests only` : llm.descriptor.message}`);
  console.log(`Windows log collector: ${process.env.SENSOR_INGEST_TOKEN ? 'enabled (/api/sensors/windows)' : 'disabled (set SENSOR_INGEST_TOKEN to enable)'}`);
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  server.listen(port, lan || hosted ? '0.0.0.0' : '127.0.0.1', () => {
    if(hosted) {console.log(`Hosted SOC lab listening on port ${port}. Site: ${publicUrl}`);return;}
    console.log(`SOC Dashboard: http://localhost:${port}\nEmployee Portal: http://localhost:${port}/employee.html\nMode: ${lan ? 'PRIVATE LAN — application events and Windows log collection' : 'LOCAL — use npm run start:lan to enable phones'}`);
    if (lan) for (const url of labUrls(port)) console.log(`LAN Device Access: ${url}`);
  });
  server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other server or set PORT.` : e.message); process.exitCode = 1; });
}
