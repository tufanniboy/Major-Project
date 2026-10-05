import { existsSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { loadConfig, projectRoot } from '../lib/config.js';
import { createLLMProvider } from '../lib/llm-provider.js';

try {
  const config = loadConfig();
  console.log(`Node.js ${process.versions.node}: supported`);
  console.log(`Local settings: ${config.envFile ? '.env found' : 'no .env; run npm run setup'}`);
  const missing = ['pg', 'qrcode'].filter(name => !existsSync(path.join(projectRoot, 'node_modules', name, 'package.json')));
  console.log(`Dependencies: ${missing.length ? 'missing; run npm ci' : 'installed'}`);
  if (missing.length) process.exitCode = 1;
  console.log(`Database: ${process.env.DATABASE_URL ? 'configured; backend startup verifies the connection' : 'not configured; lab activity is temporary'}`);
  console.log(`Windows log collector: ${(process.env.SENSOR_INGEST_TOKEN||'').length>=32 ? 'configured' : 'missing; run npm run setup or set SENSOR_INGEST_TOKEN'}`);
  const model = createLLMProvider().descriptor;
  console.log(`LLM: ${model.configured ? `${model.provider} / ${model.model} configured; not yet verified` : model.message}`);
  if (model.providers) for (const item of model.providers) console.log(`  ${item.provider}: ${item.model || 'no model'} — ${item.status}`);
  const localModel = model.provider === 'ollama' ? model : model.providers?.find(item => item.provider === 'ollama' && item.configured);
  if (localModel) {
    try {
      const response = await fetch(`${new URL(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').origin}/api/tags`, { signal: AbortSignal.timeout(4000), redirect: 'error' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      const names = (result.models || []).map(item => item.name);
      const installed = names.includes(localModel.model) || names.includes(`${localModel.model}:latest`);
      console.log(installed ? 'Ollama: service reachable and selected model installed (generation not tested)' : 'Ollama: service reachable; download the selected model first');
    } catch { console.log('Ollama: not reachable; start Ollama and check OLLAMA_BASE_URL.'); }
  }
  const check = net.createServer();
  await new Promise(resolve => {
    check.once('error', () => { console.log(`Port ${config.port}: unavailable or already used. If this is your lab server, use its open window; otherwise choose another PORT.`); resolve(); });
    check.listen(config.port, '0.0.0.0', () => check.close(() => { console.log(`Port ${config.port}: available`); resolve(); }));
  });
  console.log('No API inference was requested. Full steps: START-HERE.md');
} catch (error) { console.error(error.message); process.exitCode = 1; }
