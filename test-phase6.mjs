import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('./aurafit-ultra.html',import.meta.url),'utf8'),js=fs.readFileSync(new URL('./aurafit-phase6.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('./server.js',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
test('Phase 6 intelligence page and navigation are present',()=>{assert.match(html,/id="page-intelligence"/);assert.match(html,/data-page="intelligence"/);assert.match(html,/aurafit-phase6\.js/)});
test('Phase 6 reads existing local-first stores without schema changes',()=>{for(const s of ['weight_logs','workout_logs','sleep_logs','meal_logs','ai_history'])assert.ok(js.includes(s));assert.doesNotMatch(js,/indexedDB\.open\([^)]*,\s*\d/)});
test('Phase 6 AI requires explicit consent and optional context',()=>{assert.match(js,/p6Consent/);assert.match(js,/p6Include/);assert.match(js,/context\}/)});
test('Phase 6 AI output uses textContent and is saved to AI history',()=>{assert.match(js,/out\.textContent/);assert.match(js,/objectStore\('ai_history'\)/)});
test('Backend accepts personalized task while keeping existing protections',()=>{assert.match(server,/personalized/);assert.match(server,/GEMINI_API_KEY/)});
test('PWA shell caches the Phase 6 module with a fresh namespace',()=>{assert.match(sw,/aurafit-ultra-v10-bundled-android/);assert.match(sw,/aurafit-phase6\.js/)});
