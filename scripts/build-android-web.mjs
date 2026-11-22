import { build } from 'esbuild';

const result = await build({
  entryPoints: {
    'aurafit-cloud': 'aurafit-cloud.js',
    'aurafit-gemini': 'aurafit-gemini.js',
    'aurafit-android': 'aurafit-android.js',
    'aurafit-ultra-app': 'aurafit-ultra-app.js'
  },
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outdir: 'public/bundles',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  sourcemap: false,
  metafile: true,
  logLevel: 'info'
});

const outputs = Object.keys(result.metafile.outputs);
for (const required of [
  'public/bundles/aurafit-cloud.js',
  'public/bundles/aurafit-gemini.js',
  'public/bundles/aurafit-android.js',
  'public/bundles/aurafit-ultra-app.js'
]) {
  if (!outputs.some(path => path.endsWith(required))) {
    throw new Error(`Missing Android bundle output: ${required}`);
  }
}
console.log('AuraFit Android browser bundles created successfully.');
