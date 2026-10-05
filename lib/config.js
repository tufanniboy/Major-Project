import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(directory = projectRoot) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Install Node.js 22 or newer, then reopen your terminal.');
  const file = path.join(directory, '.env');
  if (existsSync(file)) {
    try { process.loadEnvFile(file); }
    catch { throw new Error('Could not read the project .env file. Check its permissions and format.'); }
  }
  // Environment variables supplied by a hosting platform take precedence.
  const port = Number(process.env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a whole number between 1 and 65535 in .env or the environment.');
  return { port, envFile: existsSync(file) };
}
