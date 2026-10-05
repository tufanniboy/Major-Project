import { esc, icon } from './utils.js';
import { roles } from '../data/mock-events.js';
import { deviceScenarios } from './device-scenarios.js';
const content = document.querySelector('#portal-content'), message = document.querySelector('#portal-message');
let registration = null, user = null, view = 'dashboard';
let demoStarted = false, blockedView = false;
let selectedScenario = 'compromise', deviceSimulation = null, simulationPending = false;
let hostedPortal = false;
const invitation = new URLSearchParams(location.search).get('join') || sessionStorage.getItem('lab-invitation') || '';
if(invitation) {sessionStorage.setItem('lab-invitation',invitation);history.replaceState(null,'',location.pathname);}
try { registration = JSON.parse(sessionStorage.getItem('lab-device') || 'null'); } catch { sessionStorage.removeItem('lab-device'); }
function status(text, error = false) { message.textContent = text; message.className = `portal-message ${error ? 'red' : 'green'}`; }
function testControls() {
  if(registration?.device.role!=='Test Device') return '';
  const scenario=deviceScenarios.find(s=>s.id===selectedScenario);
  const running=deviceSimulation?.state==='Running';
  return `<section class="portal-test"><h3>Choose this device’s attack</h3><p>Each device can run a different simulation at the same time. These generate lab records only.</p><label for="device-scenario">Attack simulation</label><select id="device-scenario" ${running||simulationPending?'disabled':''}>${deviceScenarios.map(s=>`<option value="${s.id}" ${s.id===selectedScenario?'selected':''}>${esc(s.name)}</option>`).join('')}</select><p id="device-scenario-description">${esc(scenario.description)}</p><p id="device-scenario-details">${scenario.count} events · ${scenario.duration} seconds · ${esc(scenario.detection)}</p><button class="button primary wide" id="run-device-demo" ${running||simulationPending?'disabled':''}>${icon('play')}Start selected simulation</button><button class="button ghost wide spaced" id="stop-device-demo" ${running?'':'hidden'}>Stop this device’s simulation</button><p id="device-run-status" role="status">${esc(simulationStatus())}</p><button class="text-button" id="probe-device">Send a test request ${icon('arrow')}</button></section>`;
}
function simulationStatus() {
  if(!deviceSimulation) return 'Select an attack, then watch this device in the SOC investigation queue.';
  return `${deviceSimulation.name} · ${deviceSimulation.index} / ${deviceSimulation.total} events · ${deviceSimulation.state}${deviceSimulation.state==='Complete'?'. Review the alert on the SOC laptop.':''}`;
}
function updateSimulationControls() {
  const running=deviceSimulation?.state==='Running';
  if(running) selectedScenario=deviceSimulation.id;
  const select=document.querySelector('#device-scenario'), button=document.querySelector('#run-device-demo'), stop=document.querySelector('#stop-device-demo');
  if(select) { select.value=selectedScenario; select.disabled=running||simulationPending; }
  if(button) button.disabled=running||simulationPending;
  if(stop) { stop.hidden=!running; stop.disabled=simulationPending; }
  const scenario=deviceScenarios.find(s=>s.id===selectedScenario);
  const description=document.querySelector('#device-scenario-description'), details=document.querySelector('#device-scenario-details'), progress=document.querySelector('#device-run-status');
  if(description) description.textContent=scenario.description;
  if(details) details.textContent=`${scenario.count} events · ${scenario.duration} seconds · ${scenario.detection}`;
  if(progress) progress.textContent=simulationStatus();
}
document.addEventListener('change', e=>{
  if(e.target.id==='device-scenario') {selectedScenario=e.target.value;updateSimulationControls();}
});
async function heartbeat() {
  if(!registration) return;
  try {
    const current=await request('/api/portal',{action:'heartbeat'});
    if(current.blocked && !blockedView) { blockedView=true; handleError(new Error('Blocked by simulated firewall policy.')); return; }
    deviceSimulation=current.simulation || current.demo || null;
    updateSimulationControls();
  } catch(error) {
    if(error.message.includes('Register this device again')) {blockedView=false;demoStarted=false;handleError(error);}
    else status(hostedPortal?'Connection interrupted. The hosted lab may be waking up; check your internet connection and retry.':'Connection interrupted. Check that the SOC server is still running on the same Wi-Fi.',true);
  }
}
setInterval(heartbeat, 5000);
async function request(endpoint, data) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(registration ? { 'X-Device-Token': registration.token } : {}) }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || 'The request could not be completed.'); error.status = response.status; throw error; }
  return result;
}
function render() {
  if (!registration) {
    content.innerHTML = `<div class="portal-step">01 / CONNECT DEVICE</div><h2>Join the private lab</h2><p class="muted">Register this browser session as an intentional source of application events.</p><form id="device-form"><label>Device hostname<input name="hostname" placeholder="EMPLOYEE-PHONE-02" required pattern="[A-Za-z0-9_-]{2,40}" maxlength="40" autocomplete="off"></label><label>Device role<select name="role">${roles.map(r => `<option>${r}</option>`).join('')}</select></label><label>Operating system<select name="os"><option>Android</option><option>iOS</option><option>Windows</option><option>macOS</option><option>Linux</option></select></label><button type="submit" class="button primary wide">Register device ${icon('arrow')}</button></form>`; return;
  }
  if (!user) {
    content.innerHTML = `<div class="portal-device"><i class="dot green"></i>${esc(registration.device.hostname)}<span class="mono">${registration.device.ip}</span></div>${testControls()}<div class="portal-step">02 / SIGN IN</div><h2>Employee portal</h2><p class="muted">Sign in using a fictional lab account.</p><form id="login-form"><label>Username<input name="username" placeholder="employee01" required autocomplete="off" autocapitalize="none" spellcheck="false"></label><label>Password<input type="password" name="password" required placeholder="Enter demo password" autocomplete="off"></label><button class="button primary wide" type="submit">Log in ${icon('arrow')}</button></form><div class="demo-credentials"><b>DEMO CREDENTIALS</b><p><span>Employee</span><code>employee01 / employee123</code></p><p><span>Administrator</span><code>admin / secureadmin</code></p></div><button class="text-button" id="change-device">Register a different session</button>`; return;
  }
  const pages = {
    dashboard: `<p class="eyebrow">YOUR WORKSPACE</p><h2>Hello, ${user === 'admin' ? 'Administrator' : 'Alex'}.</h2><p class="muted">Your employee session is active. Select a service to generate legitimate lab application activity.</p><div class="portal-services"><button data-page="profile">${icon('devices')}<b>My profile</b><small>Employee details</small>${icon('arrow')}</button><button data-page="documents">${icon('layers')}<b>Documents</b><small>Internal resources</small>${icon('arrow')}</button>${user === 'admin' ? `<button data-page="admin">${icon('lock')}<b>Administration</b><small>Demo admin resource</small>${icon('arrow')}</button>` : ''}</div>`,
    profile: `<p class="eyebrow">EMPLOYEE DIRECTORY</p><h2>My profile</h2><dl class="portal-profile"><dt>Name</dt><dd>${user === 'admin' ? 'Lab Administrator' : 'Alex Morgan'}</dd><dt>Account</dt><dd>${user}</dd><dt>Department</dt><dd>Engineering · Demo organization</dd><dt>Office</dt><dd>Private lab</dd></dl>`,
    documents: `<p class="eyebrow">INTERNAL KNOWLEDGE</p><h2>Documents</h2><article class="portal-document"><h3>Employee handbook</h3><p>Use the internal portal for approved work activities. Report unfamiliar login notifications to the security team. Never share credentials.</p><p class="muted">Fictional sample document · Internal · September 2026</p></article>`,
    admin: `<p class="eyebrow">ADMINISTRATOR WORKSPACE</p><h2>Administration</h2><div class="section-note">${icon('lock')}Administrative resource accessed. This activity has been recorded in the SOC.</div><p class="muted spaced">This is a demonstration resource with no real account-management permissions.</p>`
  };
  content.innerHTML = `<div class="portal-device"><i class="dot green"></i>${esc(registration.device.hostname)}<span class="mono">${registration.device.ip}</span></div><nav class="portal-nav" aria-label="Employee navigation">${['dashboard', 'profile', 'documents'].map(p => `<button class="${view === p ? 'active' : ''}" data-page="${p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}<button data-page="logout">Logout</button></nav>${pages[view]}${testControls()}`;
}
document.addEventListener('submit', async e => {
  if (!['device-form', 'login-form'].includes(e.target.id)) return;
  e.preventDefault(); const button = e.target.querySelector('button[type="submit"]'), fields = Object.fromEntries(new FormData(e.target)); button.disabled = true; status('Sending intentional lab event…');
  try {
    if (e.target.id === 'device-form') { registration = await request('/api/register', {...fields,joinCode:invitation}); blockedView=false; demoStarted=false; deviceSimulation=null; sessionStorage.setItem('lab-device', JSON.stringify(registration)); status('Device registered. The SOC inventory has been updated.'); }
    else { const result = await request('/api/portal', { action: 'login', ...fields }); user = result.user; view = 'dashboard'; await request('/api/portal', { action: 'dashboard' }); status('Signed in. Authentication and page access recorded.'); }
    render();
  } catch (error) { handleError(error); } finally { button.disabled = false; }
});
function handleError(error) {
  status(error.message, true);
  if (error.message.includes('Register this device again')) { registration = null; user = null; blockedView=false; demoStarted=false; deviceSimulation=null; sessionStorage.removeItem('lab-device'); render(); }
  if (error.message.includes('Blocked by simulated firewall')) { user = null; content.innerHTML = `<div class="portal-blocked">${icon('lock')}<p class="eyebrow">SIMULATED CONTAINMENT</p><h2>Request blocked</h2><p class="muted">This device was restricted by an analyst-approved lab response.</p><div class="section-note">BLOCKED BY SIMULATED FIREWALL POLICY</div><p class="mono spaced">${esc(registration?.device.ip)}</p><p class="muted">Ask the analyst to reset the lab when the demonstration is complete.</p></div>`; }
}
document.addEventListener('click', async e => {
  if(e.target.closest('#run-device-demo')) {
    simulationPending=true; updateSimulationControls();
    try { const result=await request('/api/portal',{action:'demo-sequence',scenario:selectedScenario}); deviceSimulation=result.simulation; demoStarted=true; status(`${deviceSimulation.name} started for this device.`); }
    catch(error) { handleError(error); await heartbeat(); }
    finally {simulationPending=false;updateSimulationControls();}
    return;
  }
  if(e.target.closest('#stop-device-demo')) {
    simulationPending=true;updateSimulationControls();
    try { const result=await request('/api/portal',{action:'stop-demo'}); deviceSimulation=result.simulation;status('This device’s simulation stopped. Other devices keep running.'); }
    catch(error){handleError(error);}
    finally {simulationPending=false;updateSimulationControls();}
    return;
  }
  if(e.target.closest('#probe-device')) {
    try {await request('/api/portal',{action:'probe'});status('Test request received by the SOC.');}
    catch(error){handleError(error);} return;
  }
  const page = e.target.closest('[data-page]');
  if (e.target.id === 'change-device') { registration = null; user = null; blockedView=false; demoStarted=false; deviceSimulation=null; sessionStorage.removeItem('lab-device'); status('Register a new logical session. The previous inventory record is retained.'); render(); return; }
  if (!page) return;
  try {
    await request('/api/portal', { action: page.dataset.page });
    if (page.dataset.page === 'logout') user = null; else view = page.dataset.page;
    status(`${page.dataset.page === 'logout' ? 'Session ended' : 'Page access recorded'} · visible in the SOC event stream.`); render();
  } catch (error) { handleError(error); }
});
try {
  const response = await fetch('/api/config'); if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('The employee portal requires the local Node.js server. Run npm start on the SOC laptop.');
  hostedPortal=(await response.json()).mode==='Hosted lab';
  if(hostedPortal) document.querySelector('.portal-lab-tag').textContent='ONLINE LAB';
  render(); await heartbeat();
} catch (e) { content.innerHTML = `<h2>Local server required</h2><p class="muted">${esc(e.message)}</p><p class="mono cyan-text">npm start</p><p class="muted">For phones on the same Wi-Fi, use npm run start:lan.</p>`; }
