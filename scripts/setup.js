import { copyFile, constants, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { projectRoot } from '../lib/config.js';

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Install Node.js 22 or newer from https://nodejs.org, then reopen this terminal.');
  process.exitCode = 1;
} else {
  try {
    await copyFile(path.join(projectRoot, '.env.example'), path.join(projectRoot, '.env'), constants.COPYFILE_EXCL);
    console.log('Created your local .env settings. Default: local simulation, no paid API calls.');
  } catch (error) {
    if (error.code === 'EEXIST') console.log('Your existing .env settings were kept.');
    else { console.error('Could not create .env. Extract the ZIP to a writable folder and try again.'); process.exitCode = 1; }
  }
  if (!process.exitCode) {
    const envPath=path.join(projectRoot,'.env');
    let settings=await readFile(envPath,'utf8');
    if(!/^SENSOR_INGEST_TOKEN=.{32,}$/m.test(settings)) {
      const line=`SENSOR_INGEST_TOKEN=${randomBytes(32).toString('hex')}`;
      settings=/^SENSOR_INGEST_TOKEN=.*$/m.test(settings)?settings.replace(/^SENSOR_INGEST_TOKEN=.*$/m,line):`${settings.trimEnd()}\n${line}\n`;
      await writeFile(envPath,settings,{encoding:'utf8',mode:0o600});
      console.log('Created a private Windows collector token. Keep it private; the collector reads it from .env.');
    }
  }
  if (!process.exitCode) console.log('Next: npm ci, then npm run start:lan. Read START-HERE.md for phone, LLM and database setup.');
}
