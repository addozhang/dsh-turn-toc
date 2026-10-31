// Build the plugin's two artifacts:
//   lib/client.js — the browser half wrapped as a module-table factory
//     (window.__ModuleLoader__.load) whose `require` resolves the shared
//     baseline modules (React, Cordis, dsh client libraries) at runtime.
//   lib/index.js — the no-op Host entry.
import { build, context } from 'esbuild'

const PKG_ID = '@addozhang/dsh-turn-toc'

// The shell's frozen module table seeds exactly these specifiers; everything
// else the plugin needs is bundled into lib/client.js.
const BASELINE_EXTERNAL = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/cordis', 'zod', '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-dockkit',
]

const client = {
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  sourcemap: false,
  jsx: 'automatic',
  external: BASELINE_EXTERNAL,
  legalComments: 'none',
  banner: {
    js: [
      '// generated from src/ — run `npm run build` after editing',
      'window.__ModuleLoader__.load({',
      `  id: ${JSON.stringify(PKG_ID)},`,
      '  factory: (require) => {',
      '    var module = { exports: {} };',
      '    var exports = module.exports;',
    ].join('\n'),
  },
  footer: { js: ['    return module.exports;', '  },', '});'].join('\n') },
}

const host = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  outfile: 'lib/index.js',
}

if (process.argv.includes('--watch')) {
  const watching = await context(client)
  await watching.watch()
  console.log('watching src/client → lib/client.js')
} else {
  await Promise.all([build(client), build(host)])
  console.log('built lib/client.js, lib/index.js')
}
