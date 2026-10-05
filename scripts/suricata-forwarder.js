import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { loadConfig } from '../lib/config.js';
import { isPrivateIp } from '../js/simulation.js';

loadConfig();
const args = process.argv.slice(2);
const valueAfter = name => { const index=args.indexOf(name); return index>=0 ? args[index+1] : undefined; };
const file = valueAfter('--file') || process.env.SURICATA_EVE_PATH;
const once = args.includes('--once'), fromStart = once || args.includes('--from-start');
const token = process.env.SENSOR_INGEST_TOKEN || '';
if (!file) throw new Error('Set SURICATA_EVE_PATH or pass --file with the path to Suricata eve.json.');
if (!existsSync(file)) throw new Error(`Suricata EVE file was not found: ${file}`);
if (token.length < 32) throw new Error('Set the same 32+ character SENSOR_INGEST_TOKEN used by the SOC backend.');

const rawUrl = valueAfter('--url') || process.env.SENSOR_URL || `http://127.0.0.1:${process.env.PORT || 8000}`;
let endpoint;
try {
  const url = new URL(rawUrl);
  const localHttp = url.protocol === 'http:' && (['localhost','127.0.0.1','[::1]'].includes(url.hostname) || isPrivateIp(url.hostname));
  if (url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname) || !(url.protocol === 'https:' || localHttp)) throw new Error();
  endpoint = new URL('/api/sensors/suricata',url).href;
} catch { throw new Error('SENSOR_URL must be an HTTPS origin, or an HTTP localhost/private IPv4 origin.'); }

let position = fromStart ? 0 : (await stat(file)).size;
let carry = Buffer.alloc(0), queue = [], malformed = 0, stopping = false;
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const readRange = (start,end) => new Promise((resolve,reject) => {
  const chunks=[];
  const stream=createReadStream(file,{start,end});
  stream.on('data',chunk=>chunks.push(chunk)); stream.on('error',reject); stream.on('end',()=>resolve(Buffer.concat(chunks)));
});
async function collect() {
  if(queue.length>=500) return false;
  const info=await stat(file);
  if(info.size<position) {position=0;carry=Buffer.alloc(0);}
  if(info.size===position) return false;
  const end=Math.min(info.size-1,position+1048575), chunk=await readRange(position,end);
  position=end+1;
  const data=Buffer.concat([carry,chunk]), lines=[];
  let start=0;
  for(let i=0;i<data.length;i++) if(data[i]===10) {lines.push(data.subarray(start,i));start=i+1;}
  carry=data.subarray(start);
  for(const bytes of lines) {
    if(!bytes.length) continue;
    if(bytes.length>262144) {malformed++;continue;}
    try {queue.push(JSON.parse(bytes.toString('utf8')));} catch {malformed++;}
  }
  return true;
}
async function send() {
  if(!queue.length) return;
  const batch=queue.slice(0,100);
  const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(batch),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error || `Collector returned HTTP ${response.status}.`);
  queue.splice(0,batch.length);
  console.log(`Forwarded ${result.accepted} alert(s); ${result.duplicates} duplicate(s); ${result.ignored} non-alert record(s) ignored.`);
}

console.log(`Watching ${file}`);
console.log(`Sending EVE records to ${endpoint}`);
process.once('SIGINT',()=>{stopping=true;}); process.once('SIGTERM',()=>{stopping=true;});
let delay=1000;
while(!stopping) {
  try {
    const readMore=await collect();
    while(queue.length) await send();
    delay=1000;
    const info=await stat(file);
    if(once&&position>=info.size) {
      if(carry.length) {try {queue.push(JSON.parse(carry.toString('utf8')));} catch {malformed++;} carry=Buffer.alloc(0); if(queue.length) continue;}
      break;
    }
    if(!readMore) await wait(1000);
  } catch(error) {
    console.error(`Forwarding paused: ${error.message}`);
    await wait(delay); delay=Math.min(delay*2,30000);
  }
}
console.log(`Suricata forwarder stopped${malformed ? `; ${malformed} malformed or oversized line(s) skipped` : ''}.`);
