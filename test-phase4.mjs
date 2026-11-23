import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const get = f => readFile(new URL(f, import.meta.url), 'utf8');
test('PWA manifest and worker exist with expected scope', async()=>{
 const manifest=JSON.parse(await get('./manifest.webmanifest'));
 assert.equal(manifest.name,'AuraFit AI Ultra');assert.equal(manifest.display,'standalone');
 const sw=await get('./service-worker.js');assert.match(sw,/aurafit-ultra-v11-bundled-android/);assert.match(sw,/\/api\//);
});
test('Gemini credentials and provider endpoint are absent from frontend', async()=>{
 for(const f of ['./aurafit-ultra.html','./aurafit-ultra-app.js','./aurafit-ultra.css','./service-worker.js']){
  const s=await get(f);assert.doesNotMatch(s,/GEMINI_API_KEY|generativelanguage\.googleapis\.com/);
 }
});
test('server keeps Gemini key in environment and upstream request header',async()=>{
 const s=await get('./server.js');assert.match(s,/process\.env\.GEMINI_API_KEY/);assert.match(s,/x-goog-api-key/);assert.doesNotMatch(s,/generateContent\?key=/);
 assert.match(s,/express\.json\(\{limit:'20kb'/);assert.match(s,/aiLimiter/);
});
test('AI requests require per-request consent and optional context',async()=>{
 const s=await get('./aurafit-ultra-app.js');assert.match(s,/if\(!\$\('aiConsent'\)\.checked\)/);assert.match(s,/\$\('includeContext'\)\.checked\?selectedFitnessContext\(\):null/);assert.match(s,/\$\('aiConsent'\)\.checked=false/);
});
test('AI output is rendered as text, not HTML',async()=>{
 const s=await get('./aurafit-ultra-app.js');assert.match(s,/content\.textContent=textValue/);assert.doesNotMatch(s,/innerHTML\s*=\s*answer/);
});
