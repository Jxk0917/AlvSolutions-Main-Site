/* Walks _site/, resolves every internal href, and reports anything that does
   not exist. Also counts the PLACEHOLDER markers, which is the deliberate
   pre-launch checklist: a blank price must be findable, not just visible.

   Run after a build: node check-site.mjs */
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '_site');

/* The two demo builds are standalone sites copied in verbatim. They link
   relatively among their own files, which is correct for them and would be
   wrong for this site, so they are not this checker's business. */
const SKIP = new Set(['Demo Restaurant', 'Demo Detailer']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = walk(ROOT);
const rel = (p) => p.slice(ROOT.length).replace(/\\/g, '/');

let broken = 0;
let checked = 0;
let placeholders = 0;
const phPages = new Map();
const ids = new Map();

// first pass: collect every id so #anchors can be checked too
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  ids.set(rel(p), new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const page = rel(p);

  const n = (html.match(/PLACEHOLDER/g) || []).length;
  if (n) { placeholders += n; phPages.set(page, n); }

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let href = m[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(href)) continue;
    if (!href.startsWith('/')) continue;   // nothing should be relative now
    checked++;

    const [beforeHash, hash] = decodeURIComponent(href).split('#');
    const pathPart = beforeHash.split('?')[0];
    let target = join(ROOT, pathPart);
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');

    if (!existsSync(target)) {
      console.log(`BROKEN  ${page}  ->  ${href}`);
      broken++;
      continue;
    }
    if (hash) {
      const set = ids.get(rel(target));
      if (set && !set.has(hash)) {
        console.log(`NO ANCHOR  ${page}  ->  ${href}`);
        broken++;
      }
    }
  }

  // relative links would silently work locally and break under a path prefix
  for (const m of html.matchAll(/(?:href|src)="((?!https?:|mailto:|tel:|data:|#|\/)[^"]+)"/g)) {
    console.log(`RELATIVE  ${page}  ->  ${m[1]}`);
    broken++;
  }
}

console.log(`\n${pages.length} pages, ${checked} internal links checked, ${broken} problems.`);
console.log(`${placeholders} PLACEHOLDER markers across ${phPages.size} pages:`);
for (const [p, n] of [...phPages].sort((a, b) => b[1] - a[1])) console.log(`   ${n}  ${p}`);
process.exit(broken ? 1 : 0);
