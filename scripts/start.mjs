import { spawn } from 'node:child_process';

const port = process.env.PORT || '4321';
const child = spawn(
  'npx',
  ['astro', 'preview', '--host', '0.0.0.0', '--port', String(port)],
  { stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 0));
