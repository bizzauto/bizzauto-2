import * as esbuild from 'esbuild'
import { cp } from 'fs/promises'

await esbuild.build({
  entryPoints: ['src/server/index.ts', 'src/server/worker.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist/server',
  outExtension: { '.js': '.cjs' },
  external: [
    '@prisma/client',
    'bullmq',
    'sharp',
    'html-pdf-node',
  ],
  format: 'cjs',
  sourcemap: true,
})

// Copy Prisma schema and client
await cp('prisma', 'dist/prisma', { recursive: true })

console.log('Server build complete')
