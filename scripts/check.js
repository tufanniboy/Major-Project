import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const dirs = ['js', 'data', 'lib', 'scripts', 'tests'];
let count = 0;
for (const file of ['server.js', ...(await Promise.all(dirs.map(async dir => (await readdir(dir)).filter(f => f.endsWith('.js')).map(f => `${dir}/${f}`)))).flat()]) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status) { console.error(result.stderr); process.exitCode = 1; } count++;
}
for (const file of ['index.html', 'employee.html', 'analyst-login.html']) {
  const html = await readFile(file, 'utf8');
  if (/\son\w+=|\sstyle=/.test(html)) throw new Error(`${file} contains inline code or styles.`);
}
console.log(`Checked ${count} JavaScript files and all three HTML entrypoints.`);
