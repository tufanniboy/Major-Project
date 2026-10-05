export function detectRules(event, recent, device) {
  if (event.action === 'Blocked') return [];
  const related = recent.filter(e => e.sourceIp === event.sourceIp && e.destinationIp === event.destinationIp && e.action !== 'Blocked');
  const auth = related.filter(e => e.user === event.user);
  const failures = auth.filter(e => e.eventType === 'LOGIN_FAILED');
  const hits = [];
  const add = (rule, title, severity, initialRule, techniques, evidence, truth = 'malicious') => hits.push({ rule, title, severity, initialRule, techniques, evidence, truth });
  if (event.eventType === 'LOGIN_FAILED' && failures.length >= 5) add('failures', 'Authentication failure burst', 'high', 'AUTH-005 · ≥5 failures / 60s', ['T1110'], failures);
  const icmp = related.filter(e => e.eventType === 'ICMP_ACTIVITY');
  if (event.eventType === 'ICMP_ACTIVITY' && icmp.length >= 20) add('icmp-flood', 'High rate of blocked ICMP packets', 'high', 'WIN-ICMP-020 · ≥20 blocked ICMP packets / 60s', [], icmp);
  if (['LOGIN_SUCCESS', 'ADMIN_ACCESS'].includes(event.eventType) && failures.length >= 5 && auth.some(e => e.eventType === 'LOGIN_SUCCESS')) add('compromise', 'Potential credential compromise', 'high', 'AUTH-009 · failure burst → success', ['T1110', 'T1078'], auth.filter(e => ['LOGIN_FAILED', 'LOGIN_SUCCESS', 'ADMIN_ACCESS'].includes(e.eventType)));
  const ports = related.filter(e => e.eventType === 'PORT_ATTEMPT');
  if (event.eventType === 'PORT_ATTEMPT' && new Set(ports.map(e => e.port)).size >= 6) add('ports', 'Service discovery pattern', 'medium', 'NET-006 · ≥6 distinct ports / 60s', ['T1046'], ports);
  const denied = related.filter(e => e.eventType === 'API_DENIED');
  if (event.eventType === 'API_DENIED' && denied.length >= 4) add('api', 'Repeated sensitive API denial', 'high', 'API-004 · ≥4 denied requests / 60s', ['T1213'], denied);
  if (event.eventType === 'PRIVILEGE_CHANGE') add('privilege', 'Unapproved privilege change', 'critical', 'IAM-001 · privilege change without approval', ['T1098'], [event]);
  if (event.eventType === 'SENSITIVE_FILE' && device?.trust !== 'Trusted') add('files', 'Sensitive resource access', 'high', 'DLP-002 · untrusted sensitive file access', ['T1005'], related.filter(e => e.eventType === 'SENSITIVE_FILE'));
  const transfers = related.filter(e => e.eventType === 'LARGE_TRANSFER');
  if (event.eventType === 'LARGE_TRANSFER' && transfers.reduce((n, e) => n + e.bytes, 0) >= 50000000) add('exfil', 'Unusual transfer volume', 'critical', 'DLP-050 · ≥50 MB synthetic transfer / 60s', ['T1041'], transfers);
  if (event.eventType === 'MAINTENANCE') add('maintenance', 'Maintenance request anomaly', 'low', 'OPS-001 · service request anomaly', [], related.filter(e => e.eventType === 'MAINTENANCE'), 'benign');
  if (event.eventType === 'DEVICE_REGISTERED' && device?.trust === 'Untrusted') add('device', 'Untrusted device registered', 'low', 'DEV-001 · unknown trust', [], [event]);
  if (event.eventType === 'UNUSUAL_LOGIN') add('unusual', 'Login outside working hours', 'medium', 'AUTH-020 · outside 08:00–20:00', ['T1078'], [event]);
  if (related.length >= 35) add('rate', 'Unusually high request rate', 'medium', 'NET-035 · ≥35 requests / 60s', [], related);
  return hits;
}
