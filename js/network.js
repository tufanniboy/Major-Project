import { esc, icon, time } from './utils.js';

// One current record per source keeps concurrent devices visible without a packet pile-up.
export function networkActivity(state, now = Date.now()) {
  const latest = new Map();
  for (const event of state.events) {
    const age = now - Date.parse(event.timestamp);
    if (event.fixture || age < 0 || age >= 6000) continue;
    const previous = latest.get(event.sourceIp);
    if (!previous || Date.parse(event.timestamp) > Date.parse(previous.timestamp)) latest.set(event.sourceIp, event);
  }
  return [...latest.values()].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).map(event=>({
    ...event, tone: event.action === 'Blocked' ? 'blocked' : event.risk !== 'low' ? 'suspicious' : 'normal'
  }));
}
export function trafficRoute(sourceY, destinationIp, blocked = false) {
  if (blocked) return `M250 ${sourceY}H315V95H363`;
  if (destinationIp === '192.168.1.5') return `M250 ${sourceY}H315V215H375`;
  const targetY = destinationIp === '192.168.1.25' ? 205 : 95;
  return `M250 ${sourceY}H315V95H595V${targetY}H640`;
}
function packet(path, tone, age, small = false) {
  return `<g class="network-packet ${tone}"><circle r="${small?3.5:5}" cx="0" cy="0"><animateMotion path="${path}" dur="1.6s" begin="-${(age/1000).toFixed(2)}s" repeatCount="indefinite"/></circle></g>`;
}
export function network(state, large = false) {
  const now=Date.now(), activity=networkActivity(state,now), bySource=new Map(activity.map(e=>[e.sourceIp,e]));
  const clients=state.devices.filter(d=>!['192.168.1.5','192.168.1.20','192.168.1.25'].includes(d.ip));
  const ordered=[...clients].sort((a,b)=>Number(bySource.has(b.ip))-Number(bySource.has(a.ip)) || Number(a.synthetic)-Number(b.synthetic));
  const shown=ordered.slice(0,large?6:3), height=Math.max(345,shown.length*84+65);
  const sources=shown.map((d,i)=>({key:d.ip,x:135,y:95+i*84,device:d,glyph:['Android','iOS'].includes(d.os)?'phone':'devices'}));
  const nodes=[...sources,
    {key:'firewall',x:450,y:95,label:'Lab policy',detail:'Simulated firewall',compact:true},
    {key:'siem',x:450,y:215,label:'Event collector',detail:'App + IDS records',compact:true},
    {key:'ai',x:450,y:300,label:'SOC analysis',detail:'Rules + context',compact:true},
    {key:'192.168.1.20',x:750,y:95,device:state.devices.find(d=>d.ip==='192.168.1.20'),glyph:'server'},
    {key:'192.168.1.25',x:750,y:205,device:state.devices.find(d=>d.ip==='192.168.1.25'),glyph:'lock'}
  ];
  const visible=activity.filter(e=>sources.some(n=>n.key===e.sourceIp));
  const wire=sources.map(n=>`M250 ${n.y}H315V95H375`).join(' ');
  const flows=visible.map(e=>{
    const source=sources.find(n=>n.key===e.sourceIp), path=trafficRoute(source.y,e.destinationIp,e.tone==='blocked');
    return `<g class="network-flow ${e.tone}" data-event-id="${esc(e.id)}"><title>${esc(e.sourceDevice)}: ${esc(e.label)} · ${e.tone==='blocked'?'Stopped at lab policy':esc(e.destinationDevice)}</title><path class="network-flow-line" d="${path}"/>${packet(path,e.tone,now-Date.parse(e.timestamp))}${e.tone==='blocked'?'<path class="policy-stop" d="M359 84l12 22M371 84l-12 22"/>':''}</g>`;
  }).join('');
  const incoming=new Set(visible.filter(e=>e.tone!=='blocked').map(e=>e.destinationIp));
  const hasServiceTraffic=visible.some(e=>e.tone!=='blocked'&&e.destinationIp!=='192.168.1.5');
  const hasBlockedTraffic=visible.some(e=>e.tone==='blocked');
  const feed=activity.slice(0,large?5:2);
  return `<div class="network-wrap paper-network ${large?'network-large':''}"><div class="network-live-strip"><span><i class="dot ${activity.length?'green':'neutral'}"></i>${activity.length?`${activity.length} active device source${activity.length===1?'':'s'}`:'Waiting for device activity'}</span><small>${activity.length?'Activity in the last 6 seconds':'Access the portal or start a simulation to see traffic'}</small></div><svg class="network-svg" viewBox="0 0 900 ${height}" role="group" aria-label="Live private lab network. Green: normal access. Amber: suspicious activity. Red: requests stopped at simulated policy."><text x="20" y="29" class="map-zone-label">DEVICES & SESSIONS</text><text x="375" y="29" class="map-zone-label">SOC LAPTOP</text><text x="640" y="29" class="map-zone-label">LAB SERVICES</text><g class="map-edges"><path d="${wire} M525 95H640 M595 95V205H640 M595 205V215H525 M450 125V185 M450 245V270"/></g>${flows}${hasServiceTraffic?`<path class="telemetry-line" d="M595 205V215H525"/>${packet('M595 205V215H525','telemetry',now-Date.parse(visible[0].timestamp),true)}`:''}${hasBlockedTraffic?`<path class="telemetry-line" d="M450 125V185"/>${packet('M450 125V185','telemetry',now-Date.parse(visible[0].timestamp),true)}`:''}${visible.length?`<path class="telemetry-line" d="M450 245V270"/>${packet('M450 245V270','telemetry',now-Date.parse(visible[0].timestamp),true)}`:''}${nodes.map(n=>{
    const d=n.device, event=bySource.get(n.key), blocked=d?.status==='Simulated blocked', w=n.compact?150:n.device&&n.x===135?230:220;
    const label=d?.hostname||n.label, detail=d?.peerIp||d?.ip||n.detail;
    const hot=event?.tone||(incoming.has(n.key)?'receiving':visible.length&&n.compact?'receiving':'');
    return `<g class="map-node ${blocked?'map-blocked':''} ${d&&!d.synthetic?'map-live':''} ${hot?`map-active-${hot}`:''}" transform="translate(${n.x} ${n.y})" role="button" tabindex="0" aria-label="Inspect ${esc(label)}" data-node="${n.key}"><title>${esc(label)}${event?` · ${esc(event.label)}`:d?` · ${d.status}`:''}</title><rect class="map-node-box" x="${-w/2}" y="-30" width="${w}" height="60" rx="6"/>${n.compact?'':`<g transform="translate(${-w/2+13} -11)">${icon(n.glyph)}</g>`}<text class="map-node-name" x="${n.compact?0:-w/2+45}" y="-4" text-anchor="${n.compact?'middle':'start'}">${esc(label.length>23?label.slice(0,21)+'…':label)}</text><text class="map-node-detail" x="${n.compact?0:-w/2+45}" y="14" text-anchor="${n.compact?'middle':'start'}">${esc(detail)}</text>${d?`<circle class="map-status ${blocked?'blocked':d.status==='Offline'?'offline':''}" cx="${w/2-10}" cy="-20" r="3"/>`:''}</g>`;
  }).join('')}</svg><div class="map-key"><span><i class="dot green"></i>Normal access</span><span><i class="dot amber"></i>Suspicious</span><span><i class="dot red"></i>Blocked at policy</span>${clients.length>shown.length?`<a class="right" href="#devices">+${clients.length-shown.length} devices · active sources shown first</a>`:''}</div><div class="network-event-feed" aria-label="Recent network activity">${feed.length?feed.map(e=>`<div class="network-event ${e.tone}"><span class="network-event-kind">${e.tone==='normal'?'Access':e.tone==='blocked'?'Blocked':'Suspicious'}</span><div><strong>${esc(e.sourceDevice)}</strong><span>${esc(e.label)} → ${e.tone==='blocked'?'Lab policy':esc(e.destinationDevice)}</span></div><time>${time(e.timestamp)}</time></div>`).join(''):'<p>Live access and attack events will appear here. Historical demonstration fixtures do not animate.</p>'}</div></div>`;
}
