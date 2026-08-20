import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { wwwRedirectLocation } from './lib/canonical-host.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.map': 'application/json',
};

function send(res, status, headers, body) {
  res.writeHead(status, { Connection: 'close', ...headers });
  res.end(body ?? '');
}

function sendFile(res, filePath, status = 200) {
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const { size } = statSync(filePath);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': size,
    Connection: 'close',
  });
  createReadStream(filePath).pipe(res);
}

function isInsideDist(filePath, distRoot) {
  const relative = filePath.slice(distRoot.length);
  return filePath.startsWith(distRoot) && (relative === '' || relative.startsWith(sep));
}

export function createDistServer(distDir) {
  const distRoot = resolve(distDir);

  return http.createServer((req, res) => {
    const location = wwwRedirectLocation(req.headers.host, req.url || '/');
    if (location) {
      send(res, 301, { Location: location });
      return;
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
      return;
    }

    const hasExtension = extname(pathname) !== '';
    if (pathname !== '/' && !pathname.endsWith('/') && !hasExtension) {
      const suffix = url.search || '';
      send(res, 301, { Location: `${pathname}/${suffix}` });
      return;
    }

    const relative = pathname === '/' ? '' : pathname.replace(/^\/+/, '');
    const candidate = normalize(join(distRoot, relative));
    if (!isInsideDist(candidate, distRoot)) {
      send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
      return;
    }

    let filePath = candidate;
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      sendFile(res, filePath, 200);
      return;
    }

    const notFound = join(distRoot, '404.html');
    if (existsSync(notFound)) {
      sendFile(res, notFound, 404);
      return;
    }

    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
  });
}

export function listenDistServer(distDir, port, host = '0.0.0.0') {
  const server = createDistServer(distDir);
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolvePromise(server));
  });
}
