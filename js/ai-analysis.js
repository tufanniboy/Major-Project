import { techniques } from '../data/mitre-data.js';
export const analysisStages = ['Queued', 'Correlating events', 'Retrieving context', 'Analyzing', 'Mapping MITRE ATT&CK', 'Generating response', 'Complete'];
const narratives = {
  compromise: 'Repeated authentication failures were followed by a successful login to the same account. Subsequent administrative access, when present, strengthens the possibility of credential compromise. Verify the account owner and session activity before concluding that this was malicious.',
  failures: 'Repeated attempts to authenticate to one account crossed the local failure threshold. This is consistent with password guessing, but a misconfigured client or a forgotten password could produce similar evidence.',
  ports: 'The source attempted to reach several distinct service ports within a short window. The pattern is consistent with service discovery. Confirm whether this device was authorized to perform an inventory operation.',
  api: 'Repeated requests for a restricted repository were denied. This may indicate attempts to access organizational information beyond the session’s permissions.',
  privilege: 'An account privilege change was recorded without an approved change reference. This may create unauthorized access or persistence and requires verification against the change record.',
  files: 'An untrusted device accessed a sensitive file. The source context and resource sensitivity suggest possible collection activity; validate the business purpose.',
  exfil: 'The source generated an unusually large synthetic transfer volume. This is consistent with possible data exfiltration, but volume alone does not establish a command-and-control channel or a confirmed compromise.',
  maintenance: 'These events match the locally approved maintenance window and trusted service account. The rule match is likely a false positive in this labeled simulation fixture.',
  device: 'A newly registered device has no established trust history. Review its owner and intended role before granting additional access.',
  rate: 'The source exceeded the local request-rate threshold. This may be automation or an application retry loop; verify the device context.',
  'icmp-flood': 'Windows Filtering Platform recorded a burst of blocked ICMP packets from one source. This may indicate ping flooding, but repeated monitoring or misconfiguration can produce similar logs. Review the source and firewall policy.',
  unusual: 'An authentication event occurred outside the lab’s configured working hours. Check the account owner’s expected schedule.'
};
export function analyzeAlert(alert, events, device) {
  const maintenance = alert.rule === 'maintenance' && events.every(e => e.changeRef === 'CHG-LAB-042') && device?.trust === 'Trusted';
  const sensorEvidence = events.some(e => e.origin === 'Windows Event Log');
  const classification = maintenance ? 'False positive' : sensorEvidence ? 'Needs review' : 'True positive';
  const confidence = maintenance ? 98 : sensorEvidence ? 70 : ({ compromise: 94, failures: 86, ports: 88, privilege: 96, files: 84, exfil: 89, api: 87, device: 65, rate: 72, unusual: 69 }[alert.rule] || 75);
  const authentication = alert.rule === 'compromise' || alert.rule === 'failures';
  const evidenceSummary = authentication
    ? `${events.filter(e => e.eventType === 'LOGIN_FAILED').length} failed authentications, ${events.filter(e => e.eventType === 'LOGIN_SUCCESS').length} successful authentications, and ${events.filter(e => e.eventType === 'ADMIN_ACCESS').length} administrative resource requests were correlated for account ${alert.user}. The sequence crossed ${alert.initialRule}. The ${device?.trust.toLowerCase() || 'unknown'} source and event order require analyst verification.`
    : `${events.length} related records matched ${alert.initialRule}. Device context: ${device?.trust || 'Unknown'}. ${maintenance ? 'All evidence carries the approved change reference CHG-LAB-042, supporting suppression.' : 'The behavior is a possible security signal; confirm the source owner and legitimate business context.'}`;
  return {
    classification, confidence, risk: maintenance ? 9 : ({ critical: 96, high: 87, medium: 58, low: 25 }[alert.severity]),
    summary: `${alert.sourceIp} → ${alert.destinationIp}. ${evidenceSummary}`,
    narrative: sensorEvidence ? narratives[alert.rule] || 'Windows recorded this activity in its Security log. The event is evidence for review, not proof of compromise; check the host, account, and surrounding activity.' : narratives[alert.rule],
    mapping: alert.techniques.map(id => ({ id, ...techniques[id] })),
    context: [
      { name: 'MITRE ATT&CK', detail: alert.techniques.length ? alert.techniques.join(' · ') : 'No technique asserted', type: 'Local reference dataset' },
      { name: 'Internal security policy', detail: maintenance ? 'Approved change CHG-LAB-042' : sensorEvidence ? 'Windows event review policy' : 'Authentication & least-privilege policy', type: 'Simulated policy' },
      { name: 'Historical events', detail: `${events.length} source, target, and account related records`, type: 'In-memory event store' },
      { name: 'Behavioral indicators', detail: `${device?.trust || 'Unknown'} source · ${alert.initialRule}`, type: sensorEvidence ? 'Windows log evidence' : 'Local synthetic intelligence' }
    ],
    recommendations: maintenance ? ['Suppress the matched maintenance alert', 'Retain the evidence and approved change reference'] : ['Temporarily restrict the affected account', 'Invalidate active sessions in the simulated session store', 'Review activity following authentication', 'Investigate the source device and verify its owner', 'Reset credentials if compromise is confirmed', 'Apply a temporary simulated source restriction'],
    engine: sensorEvidence ? 'Windows log-supported local adapter' : 'Deterministic local adapter', caveat: sensorEvidence ? 'Windows log evidence; a recorded event is not proof of compromise. Confidence is heuristic and analyst verification is required.' : 'Simulation assessment; confidence is heuristic, not a calibrated probability. Analyst verification required.'
  };
}
export const analysisAdapter = { analyze: analyzeAlert };
// Replace this boundary with a server-side provider. Never put an API key in browser code.
export async function analyzeAlertWithLLM(alert, events, device, provider) {
  if (!provider) throw new Error('No LLM provider configured. The local adapter remains available.');
  return provider({ alert, events, device });
}
