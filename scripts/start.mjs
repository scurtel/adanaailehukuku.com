import { join } from 'node:path';
import { listenDistServer } from './serve-dist.mjs';

const port = Number(process.env.PORT || 4321);
const distDir = join(process.cwd(), 'dist');

const server = await listenDistServer(distDir, port);
console.log(`Serving dist/ on 0.0.0.0:${port}`);

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
