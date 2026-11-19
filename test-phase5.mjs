import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layer=fs.readFileSync(new URL('./aurafit-ultra-data-layer.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./aurafit-ultra.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./aurafit-phase5.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');

test('Phase 5 upgrades IndexedDB without deleting existing stores',()=>{
  assert.match(layer,/DB_VERSION = 2/);
  for(const s of ['profile','weight_logs','daily_routines','daily_water_totals','meal_logs','workout_logs','sleep_logs','ai_history','settings','legacy_snapshots','migration_runs']) assert.match(layer,new RegExp(`${s}: \\{`));
  assert.match(layer,/food_catalog:/); assert.match(layer,/nutrition_goals:/);
});
test('Phase 5 health workspace exposes meal, workout, sleep and reports',()=>{
  for(const id of ['page-health','p5MealForm','p5WorkoutForm','p5SleepForm','p5GoalForm','p5ReportChart','p5ExportReport']) assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
  assert.match(html,/data-page="health"/);
});
test('Nutrition calculations use serving multipliers and persist estimates',()=>{
  assert.match(js,/kcal:f\.kcal\*n/); assert.match(js,/protein:f\.protein\*n/); assert.match(js,/carbs:f\.carbs\*n/); assert.match(js,/fat:f\.fat\*n/);
  assert.match(js,/source:'food-catalog-estimate'/);
});
test('Workout and sleep logs are saved in existing stores',()=>{
  assert.match(js,/put\(db,'workout_logs'/); assert.match(js,/put\(db,'sleep_logs'/);
});
test('PWA cache includes Phase 5 module and uses a new cache namespace',()=>{
  assert.match(sw,/aurafit-ultra-v8-android-shell/); assert.match(sw,/aurafit-phase5\.js/);
});
