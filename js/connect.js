import { esc, icon } from './utils.js';

// Image events do not bubble; capture them so both the page and dialog work.
export function installQrFeedback(root = document) {
  root.addEventListener('error', event => {
    if (!event.target.matches?.('.qr-area img')) return;
    event.target.closest('.qr-area').classList.add('qr-failed');
    event.target.closest('.qr-area').querySelector('.qr-feedback').textContent = 'The QR could not load. Open or copy the address below, or refresh to retry.';
  }, true);
  root.addEventListener('load', event => {
    if (!event.target.matches?.('.qr-area img')) return;
    event.target.closest('.qr-area').classList.remove('qr-failed');
    event.target.closest('.qr-area').querySelector('.qr-feedback').textContent = 'Scan with your phone’s camera';
  }, true);
}
export function connectionPanel(config, devices = []) {
  const hosted=config?.mode==='Hosted lab', lan=config?.mode==='Private LAN', enabled=hosted||lan;
  const urls=config?.portalUrls||[], connected=devices.filter(d=>d.status==='Connected').length;
  const portal=hosted?(urls[0]||'/employee.html'):'/employee.html';
  return `<div class="connect-intro"><span class="section-kicker">Bring your own device</span><h2>${hosted?'One invitation.<br>Connect from anywhere.':'Your devices.<br>One connected lab.'}</h2><p>Use a phone as an employee device and another phone or laptop as the test device. Their activity appears in this console.</p><ol class="join-steps"><li><span>1</span><div><b>${hosted?'Connect to the internet':'Join the same Wi-Fi or hotspot'}</b><p>${hosted?'Participating devices can use different Wi-Fi or mobile networks.':'Connect this laptop and your participating devices.'}</p></div></li><li><span>2</span><div><b>Scan the code or open the address</b><p>Register a name and choose Employee Device or Test Device.</p></div></li><li><span>3</span><div><b>Generate activity on your device</b><p>Log in normally, or choose an attack from the Test Device controls.</p></div></li></ol><a class="text-button" href="${esc(portal)}" target="_blank" rel="noopener noreferrer">Open the portal on this laptop ${icon('arrow')}</a><img class="connect-photo" src="/data/images/connected-devices.png" width="1536" height="1024" alt="Phone and laptop ready to join the lab" loading="lazy"></div>
  <div class="connect-access"><div class="connection-state"><i class="dot ${enabled?'green':'amber'}"></i>${hosted?'Hosted lab is enabled':lan?'Private LAN is enabled':'This server is local-only'}<small>${connected} live session${connected===1?'':'s'}</small></div>
  ${enabled&&urls.length?`<div class="qr-area"><img src="/api/join-qr.svg?index=0" alt="Scan to open the private lab employee portal" width="232" height="232"><span class="qr-feedback" role="status">Scan with your phone’s camera</span></div><label class="join-url-label" for="join-url">${hosted?'Device invitation link':'Private lab address'}</label><div class="join-address"><input id="join-url" readonly value="${esc(urls[0])}" aria-label="${hosted?'Device invitation link':'Private lab address'}"><button class="button primary small" data-action="copy-url">Copy</button></div>${urls.length>1?`<label class="join-interface-label">Using a different network?<select id="join-interface" aria-label="Choose network address">${urls.map((u,i)=>`<option value="${i}">${esc(u)}</option>`).join('')}</select></label>`:''}<p class="connection-tip">${hosted?'Share this invitation with your lab participants. Keep your analyst password private. The free hosted service may take a moment to wake on the first visit.':'After scanning, tap the camera link or open the address in Chrome/Safari using http://. Both devices must use the same Wi-Fi or hotspot; no internet is required.'}</p><button class="text-button spaced" data-action="refresh-connection">Refresh address & QR code</button>`:`<div class="local-setup">${icon('network')}<h3>${lan?'No private network address found':'Enable phone access'}</h3><p>${lan?'Connect this laptop to Wi-Fi or a hotspot, then refresh the connection details.':'Run these commands in the project folder:'}</p>${lan?'':'<pre>npm stop\nnpm start</pre>'}<button class="button ghost" data-action="refresh-connection">Refresh connection details</button></div>`}
  <details class="connection-help"><summary>Having trouble connecting?</summary><p>${hosted?'Use the full invitation link, including its join code. Keep the portal tab open to retain your registration. After an analyst resets the lab, register again. If the site is waking from sleep, wait briefly and retry.':'Use a private hotspot if your Wi-Fi isolates devices. Allow Node.js on the Windows private network if prompted. Keep the server running. If you use a VPN, choose the Wi-Fi address instead.'}</p></details></div>`;
}
