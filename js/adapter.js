import { SOCEngine } from './simulation.js';
export class LabAdapter {
  async connect(onState, onConnection) {
    this.onState = onState;
    try {
      const response = await fetch('/api/config');
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Static mode');
      this.config = await response.json();
      if (this.config.mode === 'Hosted lab' && !this.config.control) {
        location.assign('/analyst-login.html');
        return this.config;
      }
      this.stream = new EventSource('/api/stream');
      this.stream.onmessage = e => { onConnection(true); onState(JSON.parse(e.data)); };
      this.stream.onerror = async () => {
        onConnection(false);
        if(this.config.mode==='Hosted lab') {
          try {const r=await fetch('/api/config');const config=await r.json();if(!config.control){this.stream.close();location.assign('/analyst-login.html');}} catch { /* Retry after the service wakes. */ }
        }
      };
    } catch {
      this.engine = new SOCEngine({seed:false}); this.config = { mode: 'Browser simulation', control: true, portalUrls: [] };
      onConnection(true); onState(this.engine.state);
      this.timer = setInterval(() => { this.engine.tick(); onState(this.engine.state); }, 1000);
    }
    return this.config;
  }
  async action(name, payload = {}) {
    if (this.engine) { const result = this.engine.action(name, payload); this.onState(this.engine.state); return result; }
    const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, payload }) });
    if(response.status===401 && this.config.mode==='Hosted lab') location.assign('/analyst-login.html');
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (data.result?.events && data.result?.devices) this.onState(data.result);
    return data.result;
  }
}
