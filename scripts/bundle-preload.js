const esbuild = require('esbuild');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const outDir = path.join(__dirname, '../out');

esbuild
  .build({
    entryPoints: [path.join(srcDir, 'preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(outDir, 'preload.js'),
    external: ['electron'],
    sourcemap: true,
    format: 'cjs'
  })
  .then(() => {
    console.log('✓ Preload script bundled successfully');
  })
  .catch((error) => {
    console.error('Failed to bundle preload script:', error);
    process.exit(1);
  });
