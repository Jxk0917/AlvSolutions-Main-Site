/* Static server for the BUILT site in _site/.
   Run `npx @11ty/eleventy` first, or use `npm run serve` for the Eleventy dev
   server with watching. This one exists because the screenshot scripts need a
   server that does not rebuild underneath them mid-capture.

   Directory URLs matter now: every page except home lives at /thing/ and is
   written to _site/thing/index.html, so a server that only maps URLs to files
   404s the whole site. */
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '_site');
const PORT = 3000;

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.avif': 'image/avif', '.json': 'application/json', '.txt': 'text/plain',
};

function resolve(urlPath) {
  const p = join(ROOT, urlPath);
  if (existsSync(p) && statSync(p).isDirectory()) return join(p, 'index.html');
  if (existsSync(p)) return p;
  // /packages/add-ons/ written as add-ons/index.html is covered above; this
  // catches a link written without its trailing slash.
  const asDir = join(p, 'index.html');
  if (existsSync(asDir)) return asDir;
  return null;
}

createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = resolve(urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
  const type = mime[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(readFileSync(filePath));
}).listen(PORT, () => console.log(`\n  AlvSolutions (_site) → http://localhost:${PORT}\n`));
