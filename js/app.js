import { LabAdapter } from './adapter.js';
import { nav, shell, utility, views, trafficResults, deviceDetail, registerForm, architectureSteps } from './views.js';
import { esc, icon, time } from './utils.js';
import { lineChart, metrics } from './charts.js';
import { registerSocTools } from './webmcp.js';
import { connectionPanel, installQrFeedback } from './connect.js';
import { llmSetupContent } from './llm-panel.js';

const adapter = new LabAdapter();
installQrFeedback();
const ui = { route: location.hash.slice(1) || 'command', connected: false, queue: 'active', config: null, alertFilter: 'All', selectedAlert: null, traffic: { search: '', source: '', destination: '', protocol: '', risk: '', status: '' }, paused: false, pausedEvents: null, autoScroll: true, clearBefore: 0, demo: null };
let state, lastGeneration, knownAlerts = new Set(), loaded = false;
const main = document.querySelector('#main'), modal = document.querySelector('#modal');
function toast(message, error = false) {
  const el = document.createElement('div'); el.className = `toast ${error ? 'error' : ''}`; el.textContent = message;
  document.querySelector('#toast-region').append(el); setTimeout(() => el.remove(), 5000);
}
function render() {
  if (!state) return;
  if (!views[ui.route]) ui.route = 'command';
  document.title = `${nav.find(n => n[0] === ui.route)[1]} · SOC Analyst Lab`;
  const focused = document.activeElement;
  const welcomePanel = ui.route === 'command' ? main.querySelector('.illustrated-heading') : null;
  const connectionCard = ui.route === 'devices' ? main.querySelector('.connection-workspace') : null;
  const connectionConfig = JSON.stringify(ui.config);
  const focusAttributes = ['id', 'data-action', 'data-alert', 'data-scenario', 'data-device', 'data-node', 'data-alert-filter', 'data-queue', 'data-decision', 'data-architecture', 'href'];
  const focusKey = focusAttributes.find(key => focused?.hasAttribute(key));
  const focusValue = focusKey && focused.getAttribute(focusKey);
  const sidebar = document.querySelector('#sidebar');
  if (sidebar.dataset.route !== ui.route) { sidebar.innerHTML = shell(ui.route); sidebar.dataset.route = ui.route; }
  document.querySelector('#utility').innerHTML = utility(state, ui);
  // Keep active form controls intact while new telemetry arrives.
  if (ui.route === 'traffic' && main.querySelector('#traffic-results')) {
    const result = main.querySelector('#traffic-results'), wrap = result.querySelector('.table-wrap'), scroll = wrap?.scrollTop || 0;
    result.innerHTML = trafficResults(state, ui);
    const rate = main.querySelector('#traffic-rate');
    if (rate) rate.textContent = metrics(state).eps.toFixed(1);
    const chart = main.querySelector('#traffic-rate-chart');
    if (chart) chart.innerHTML = lineChart(state.rate.map(r => r.count), { height: 80 });
    if (!ui.autoScroll && result.querySelector('.table-wrap')) result.querySelector('.table-wrap').scrollTop = scroll;
  } else if (!main.contains(document.activeElement) || !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) main.innerHTML = views[ui.route](state, ui);
  if (welcomePanel && !welcomePanel.isConnected) main.querySelector('.illustrated-heading')?.replaceWith(welcomePanel);
  // Preserve the QR, selected interface and expanded help while inventory updates.
  const nextConnectionCard = main.querySelector('.connection-workspace');
  if (nextConnectionCard) {
    if (connectionCard?.dataset.config === connectionConfig && connectionCard !== nextConnectionCard) nextConnectionCard.replaceWith(connectionCard);
    const card = main.querySelector('.connection-workspace');
    card.dataset.config = connectionConfig;
    const liveCount = state.devices.filter(d => !d.synthetic && d.status === 'Connected').length;
    card.querySelector('.connection-state small').textContent = `${liveCount} live session${liveCount === 1 ? '' : 's'}`;
  }
  if (ui.route === 'traffic') for (const key of ['source', 'destination', 'protocol', 'risk', 'status']) { const select = document.querySelector(`#filter-${key}`); if (select) select.value = ui.traffic[key]; }
  renderDemo();
  if (focusKey && focused !== document.activeElement && !focused.isConnected) document.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
}
function navigate(route, force = false) {
  if (force || ui.route !== route) { ui.route = route; main.innerHTML = ''; }
  if (location.hash !== `#${route}`) location.hash = route;
  render();
}
window.addEventListener('hashchange', () => { if (location.hash === '#main') { main.focus(); return; } ui.route = location.hash.slice(1) || 'command'; main.innerHTML = ''; render(); window.scrollTo(0, 0); });
async function action(name, payload) { try { return await adapter.action(name, payload); } catch (e) { toast(e.message, true); return null; } }
function showModal(title, content) {
  modal.innerHTML = `<div class="modal-header"><h2>${esc(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${content}</div>`;
  if (!modal.open) modal.showModal();
}
function showDevice(ip) { const d = state.devices.find(d => d.ip === ip); if (d) showModal(d.hostname, deviceDetail(d, state)); }
async function refreshConnectionConfig() {
  const response = await fetch('/api/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Server unavailable');
  const config = await response.json();
  const changed = JSON.stringify(config) !== JSON.stringify(ui.config);
  ui.config = config;
  return changed;
}
async function showConnect() {
  try { await refreshConnectionConfig(); }
  catch { toast('Could not refresh the address. Check that the lab server is running.', true); }
  showModal('Connect to your lab', connectionPanel(ui.config, state.devices.filter(d=>!d.synthetic)));
}
// Wi-Fi and hotspot changes can assign a different address while the lab is open.
setInterval(async () => {
  const connectionDialog = modal.open && Boolean(modal.querySelector('.connect-intro'));
  if (!state || (!connectionDialog && ui.route !== 'devices') || adapter.engine) return;
  try {
    if (await refreshConnectionConfig()) {
      render();
      if (connectionDialog && modal.open && modal.querySelector('.connect-intro')) showModal('Connect to your lab', connectionPanel(ui.config, state.devices.filter(d=>!d.synthetic)));
    }
  } catch { /* Preserve the current view while the connection recovers. */ }
}, 10000);
const commands = [
  ['Open Command Center', 'grid', () => navigate('command')],
  ['Start Normal Traffic', 'activity', () => { if (!state.normalTraffic) action('traffic'); }],
  ['Run Suspicious Login Simulation', 'flask', () => { action('scenario', { id: 'compromise' }); navigate('lab'); }],
  ['Pause Traffic', 'pause', () => { if (state.normalTraffic) action('traffic'); }],
  ['View Critical Alerts', 'alert', () => { ui.alertFilter = 'Critical'; navigate('alerts'); }],
  ['Open Network', 'network', () => navigate('network')],
  ['Reset Simulation', 'refresh', () => requestReset()]
];
function palette() {
  modal.innerHTML = `<input class="command-search" id="command-search" placeholder="Type a command…" aria-label="Search commands"><div class="command-list" id="command-list"></div>`;
  if (!modal.open) modal.showModal(); updateCommands(''); document.querySelector('#command-search').focus();
}
function updateCommands(query) { document.querySelector('#command-list').innerHTML = commands.map(([name, glyph], i) => name.toLowerCase().includes(query.toLowerCase()) ? `<button class="command-item" data-command="${i}">${icon(glyph)}${name}<small>↵</small></button>` : '').join('') || '<p class="panel-body muted">No matching command.</p>'; }
function requestReset() { showModal('Reset the lab environment?', '<p class="muted">This clears the current events, alerts, decisions, portal registrations, and simulated blocklist. Baseline devices remain. Connected phones will need to register again.</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">Cancel</button><button class="button danger" data-action="confirm-reset">Reset environment</button></div>'); }

document.addEventListener('click', async e => {
  const button = e.target.closest('[data-action],[data-alert],[data-device],[data-node],[data-scenario],[data-alert-filter],[data-queue],[data-decision],[data-command],[data-architecture]');
  if (!button || button.disabled || !state) return;
  if (button.dataset.alert) { ui.selectedAlert = button.dataset.alert; navigate('investigations', true); return; }
  if (button.dataset.device) { showDevice(button.dataset.device); return; }
  if (button.dataset.node) {
    const node = button.dataset.node;
    if (state.devices.some(d => d.ip === node)) showDevice(node);
    else showModal({ gateway: 'Private lab gateway', firewall: 'Simulated firewall', siem: 'Windows Security log collector', ai: 'SOC intelligence engine' }[node], `<p class="analysis-summary">${{ gateway: 'A logical uplink for the diagram. The simulation does not connect to or monitor the internet.', firewall: `${state.blocked.length} sources restricted. This policy exists only inside the lab application.`, siem: `${state.sensor?.received || 0} Windows log records collected. The Windows collector forwards selected Security events; scenarios remain controlled demonstrations.`, ai: 'The deterministic local adapter builds structured assessments from correlated evidence and local policy context. Open an investigation to request a separate real LLM review when a model is configured.' }[node]}</p>`);
    return;
  }
  if (button.dataset.scenario) { await action('scenario', { id: button.dataset.scenario }); render(); return; }
  if (button.dataset.alertFilter) { ui.alertFilter = button.dataset.alertFilter; render(); return; }
  if (button.dataset.queue) { ui.queue = button.dataset.queue; render(); return; }
  if (button.dataset.decision) {
    const result = await action('decision', { id: button.dataset.id, decision: button.dataset.decision });
    if (result) { toast(button.dataset.decision === 'approve' ? `Response executed · ${result.sourceIp} is simulated blocked` : `Analyst decision recorded: ${button.dataset.decision}`); if (ui.demo && button.dataset.decision === 'approve') ui.demo.index = 10; }
    render(); return;
  }
  if (button.dataset.command !== undefined) { modal.close(); commands[Number(button.dataset.command)][2](); return; }
  if (button.dataset.architecture !== undefined) {
    const [title, purpose, input, output, technology, example] = architectureSteps[Number(button.dataset.architecture)];
    showModal(title, `<dl class="definition">${Object.entries({ Purpose: purpose, Input: input, Output: output, Technology: technology, Example: example }).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`); return;
  }
  switch (button.dataset.action) {
    case 'llm-setup': showModal('Connect a real LLM', llmSetupContent(ui.config)); break;
    case 'ask-llm':
      button.disabled = true;
      try {
        const response = await fetch('/api/llm/analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:button.dataset.id}) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not request model analysis.');
        toast(response.status === 202 ? 'Model request started. Its answer will appear here.' : 'This evidence already has a saved model answer.');
      } catch (error) { toast(error.message,true); button.disabled = false; }
      break;
    case 'sign-out':
      try { const response=await fetch('/api/auth/logout',{method:'POST'}); if(!response.ok)throw new Error('Sign-out failed.'); adapter.stream?.close(); location.assign('/analyst-login.html'); }
      catch(error){toast(error.message,true);} break;
    case 'close-modal': modal.close(); break;
    case 'traffic': await action('traffic'); break;
    case 'stop': await action('stop'); break;
    case 'presentation': document.body.classList.toggle('presentation'); toast(document.body.classList.contains('presentation') ? 'Presentation mode enabled' : 'Presentation mode disabled'); break;
    case 'notifications': showModal('Recent security notifications', state.alerts.length ? state.alerts.slice(0, 8).map(a => `<div class="response-record"><div><h3>${esc(a.title)}</h3><p>${a.id} · ${a.severity.toUpperCase()} · ${esc(a.state)}</p></div><time>${time(a.timestamp)}</time></div>`).join('') : '<p class="muted">No security notifications in this session.</p>'); break;
    case 'profile': showModal('Analyst profile', '<div class="profile"><span class="avatar">AM</span><div><h3 class="no-margin">Alex Morgan</h3><p class="muted no-margin">SOC Analyst · Tier 2 · Demo identity</p></div></div><hr class="divider"><p class="muted">Local console operator. Approve, reject, and escalate decisions are recorded against this fictional demonstration identity. This is a shared academic demonstration.</p>' + (ui.config?.mode==='Hosted lab'?'<button class="button ghost" type="button" data-action="sign-out">Sign out</button>':'')); break;
    case 'register': showModal('Register simulated device', registerForm()); break;
    case 'connect': showConnect(); break;
    case 'copy-url': {
      const field = document.querySelector('#join-url');
      try { await navigator.clipboard.writeText(field.value); toast('Private lab address copied.'); }
      catch { field.focus(); field.select(); toast('Address selected. Press Ctrl+C to copy.'); }
      break;
    }
    case 'refresh-connection': {
      try { await refreshConnectionConfig(); if(modal.open) showModal('Connect to your lab', connectionPanel(ui.config, state.devices.filter(d=>!d.synthetic))); else {main.innerHTML=''; render();} }
      catch { toast('Cannot reach the lab server. Start it with npm run start:lan.',true); }
      break;
    }
    case 'palette': palette(); break;
    case 'pause-stream': ui.paused = !ui.paused; ui.pausedEvents = ui.paused ? structuredClone(state.events) : null; main.innerHTML = ''; render(); break;
    case 'clear-stream': ui.clearBefore = Math.max(...state.events.map(e => Number(e.id.split('-')[1])), 0); render(); break;
    case 'reset': requestReset(); break;
    case 'confirm-reset': ui.demo = null; modal.close(); await action('reset'); toast('Environment reset. Baseline devices are ready.'); main.innerHTML = ''; render(); break;
    case 'demo': startDemo(); break;
    case 'demo-next': await advanceDemo(); break;
    case 'demo-previous': if (ui.demo) { ui.demo.index = Math.max(0, ui.demo.index - 1); guideNavigate(); renderDemo(); } break;
    case 'demo-exit': ui.demo = null; await action('stop'); if (state.normalTraffic) await action('traffic'); renderDemo(); toast('Guided demo ended. Investigation evidence has been retained.'); break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'join-interface') {
    const idx=Number(e.target.value), url=ui.config?.portalUrls?.[idx];
    if(url) { document.querySelector('#join-url').value=url; document.querySelector('.qr-area img').src=`/api/join-qr.svg?index=${idx}`; }
  }
  if (e.target.id.startsWith('filter-')) { ui.traffic[e.target.id.slice(7)] = e.target.value; render(); }
  if (e.target.id === 'auto-scroll') ui.autoScroll = e.target.checked;
  if (e.target.id === 'investigation-select') { ui.selectedAlert = e.target.value; navigate('investigations', true); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'traffic-search') { ui.traffic.search = e.target.value; render(); }
  if (e.target.id === 'command-search') updateCommands(e.target.value);
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'register-form') return; e.preventDefault();
  try { await adapter.action('register', Object.fromEntries(new FormData(e.target))); modal.close(); toast('New device registered in the lab inventory.'); } catch (error) { document.querySelector('#register-error').textContent = error.message; }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!boot.open) palette(); }
  if (e.target.closest('[data-node]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); e.target.closest('[data-node]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (modal.open && e.target.id === 'command-search' && ['ArrowDown', 'Enter'].includes(e.key)) { e.preventDefault(); const first = modal.querySelector('.command-item'); if (e.key === 'Enter') first?.click(); else first?.focus(); }
});

const demoSteps = [
  ['Start with normal activity', 'A typical employee session establishes the baseline.', 'command'],
  ['Employee authentication', 'The normal scenario records a successful employee login.', 'traffic'],
  ['Observe the event stream', 'Requests become normalized records with source, target, and status.', 'traffic'],
  ['Introduce suspicious authentication', 'The test device begins a controlled failed-login sequence.', 'network'],
  ['Detect the pattern', 'Five failures cross the authentication threshold. Wait for the full sequence.', 'alerts'],
  ['Correlate the evidence', 'Failures followed by success create a possible credential-compromise alert.', 'investigations'],
  ['Review the AI investigation', 'The local engine retrieves context and builds a structured assessment.', 'investigations'],
  ['Inspect MITRE mapping', 'Authentication behavior maps to T1110 and T1078.', 'investigations'],
  ['Review the response plan', 'Read the narrative and recommendations before taking action.', 'investigations'],
  ['Make the analyst decision', 'Select Approve response in the investigation. The demo will not approve for you.', 'investigations'],
  ['Verify simulated containment', 'The source is blocked. Next generates another request sequence to verify enforcement.', 'response'],
  ['Inspect the outcome', 'New test-device requests are blocked; events and decisions remain available.', 'command']
];
function startDemo() {
  if (state.running) { toast('Stop the running scenario before starting the guided demo.', true); return; }
  showModal('Start a guided demonstration', '<p class="muted">The guide starts a fresh environment for a clear presentation. Current evidence and device registrations will be cleared. You control the pace with Next and Previous; containment still requires your explicit approval.</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">Cancel</button><button class="button primary" id="begin-demo">Start fresh demo</button></div>');
  document.querySelector('#begin-demo').addEventListener('click', async () => {
    modal.close(); await action('reset'); ui.demo = { index: 0, visited: new Set([0]), alertId: null }; await action('scenario', { id: 'normal' }); navigate('command');
  }, { once: true });
}
function demoAlert() { return state.alerts.find(a => a.rule === 'compromise'); }
function guideNavigate() {
  const step = ui.demo?.index; if (step === undefined) return;
  const alert = demoAlert(); if (alert && step >= 5) ui.selectedAlert = alert.id;
  navigate(demoSteps[step][2], true);
}
async function advanceDemo() {
  if (!ui.demo) return;
  const index = ui.demo.index;
  if (index === 4 && !demoAlert()) { toast('The authentication sequence is still arriving. Wait for the compromise alert.'); return; }
  if ([6, 7, 8].includes(index) && !demoAlert()?.analysis) { toast('Wait for the analysis to finish.'); return; }
  if (index === 9 && demoAlert()?.decision !== 'approve') { toast('Approve the response in the investigation to continue, or exit the demo.'); return; }
  if (index === 11) { ui.demo = null; renderDemo(); toast('Guided demonstration complete. Evidence remains available for review.'); return; }
  ui.demo.index++;
  const next = ui.demo.index;
  if (!ui.demo.visited.has(next)) {
    ui.demo.visited.add(next);
    if (next === 3) { await action('stop'); await action('scenario', { id: 'compromise' }); }
    if (next === 11) { await action('stop'); await action('scenario', { id: 'compromise' }); }
  }
  guideNavigate();
}
function renderDemo() {
  const el = document.querySelector('#demo-guide');
  if (!ui.demo) { el.innerHTML = ''; return; }
  const [title, description] = demoSteps[ui.demo.index];
  el.innerHTML = `<aside class="demo-guide" aria-label="Guided demonstration"><div><p class="eyebrow">GUIDED DEMO · ${String(ui.demo.index + 1).padStart(2, '0')} / 12</p><h3>${title}</h3><p>${description}</p></div><div class="heading-actions"><button class="button small ghost" data-action="demo-previous" ${ui.demo.index === 0 ? 'disabled' : ''}>Previous</button><button class="button small primary" data-action="demo-next">${ui.demo.index === 11 ? 'Finish' : 'Next'}</button><button class="icon-button" data-action="demo-exit" aria-label="Exit demo">${icon('close')}</button></div></aside>`;
}

ui.config = await adapter.connect(next => {
  state = next;
  if (lastGeneration !== state.generation) { ui.paused = false; ui.pausedEvents = null; ui.clearBefore = 0; knownAlerts = new Set(); lastGeneration = state.generation; }
  if (loaded) for (const a of state.alerts) if (!knownAlerts.has(a.id)) toast(`${a.severity.toUpperCase()} alert · ${a.title}`);
  knownAlerts = new Set(state.alerts.map(a => a.id)); loaded = true; render();
}, connected => { ui.connected = connected; });
registerSocTools({ getState: () => state, navigate, adapter });
render();
