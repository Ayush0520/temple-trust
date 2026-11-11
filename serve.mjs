/* Local dev server: binds to 127.0.0.1 only, rebuilds on source change. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, extname, normalize, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function build(label) {
  const r = spawnSync(process.execPath, [join(root, 'build.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`\n[build failed] ${label}\n${r.stderr || r.stdout}`);
    return false;
  }
  console.log(`[built] ${label}`);
  return true;
}

async function resolveFile(urlPath) {
  // Strip query/hash, decode, and confine the result to dist/.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  let target = resolve(join(dist, normalize(clean)));
  if (target !== dist && !target.startsWith(dist + '/')) return null;

  try {
    if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
  } catch {
    if (!extname(target)) target += '.html';
  }
  try {
    await stat(target);
    return target;
  } catch {
    return null;
  }
}

build('initial');

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h1>404 — Not found</h1><p><a href="/">Back to home</a></p>');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Temple Trust dev server → http://${HOST}:${PORT}\n  Watching src/ and assets/ — edit and refresh.\n`);
});

let timer = null;
for (const dir of ['src', 'assets']) {
  watch(join(root, dir), { recursive: true }, (_e, name) => {
    clearTimeout(timer);
    timer = setTimeout(() => build(`${dir}/${name}`), 120);
  });
}
