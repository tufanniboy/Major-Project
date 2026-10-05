import { scenarios } from '../data/mock-events.js';
import { nav } from './views.js';
export function registerSocTools({ getState, navigate, adapter }) {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    {
      name: 'read_soc_status', title: 'Read SOC simulation status', description: 'Read current lab counters, running scenario, and alert summaries. Does not change the simulation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() {
        const state = getState(); if (!state) throw new Error('The lab is still connecting.');
        return { totalEvents: state.totalEvents, devices: state.devices.length, runningScenario: state.running?.id || null, blockedSources: state.blocked, alerts: state.alerts.map(a => ({ id: a.id, title: a.title, severity: a.severity, state: a.state })) };
      }
    },
    {
      name: 'open_soc_workspace', title: 'Open SOC workspace', description: 'Navigate to a named SOC workspace. Does not execute a response or alter lab evidence.',
      inputSchema: { type: 'object', properties: { workspace: { type: 'string', enum: nav.map(n => n[0]) } }, required: ['workspace'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) { if (!nav.some(n => n[0] === input.workspace)) throw new Error('Unknown workspace.'); navigate(input.workspace, true); return { workspace: input.workspace, opened: true }; }
    },
    {
      name: 'start_lab_scenario', title: 'Start a synthetic SOC scenario', description: 'Start one controlled synthetic event sequence in the existing lab. Records arrive once per second. No external traffic is sent and analyst approval is never granted by this tool.',
      inputSchema: { type: 'object', properties: { scenario: { type: 'string', enum: scenarios.map(s => s.id) } }, required: ['scenario'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) { if (!scenarios.some(s => s.id === input.scenario)) throw new Error('Unknown scenario.'); await adapter.action('scenario', { id: input.scenario }); navigate('lab', true); return { scenario: input.scenario, started: true }; }
    }
  ];
  for (const tool of tools) {
    try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability; the visible UI remains fully functional. */ }
  }
}
