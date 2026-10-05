import { loadConfig } from '../lib/config.js';
const { port } = loadConfig();
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/shutdown`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'This server cannot be stopped through the lab API.');
  console.log(result.message);
} catch (error) { console.error(`Could not stop the SOC server on port ${port}: ${error.message}`); process.exitCode = 1; }
