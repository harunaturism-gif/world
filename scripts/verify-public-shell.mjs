import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('.');
const publicRoot = resolve('public');
const failures = [];

function requireMatch(content, pattern, message) {
  if (!pattern.test(content)) failures.push(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTextFiles(path);
    return ['.html', '.json', '.txt', '.xml'].includes(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

const html = await readFile(join(root, 'index.html'), 'utf8');
requireMatch(html, /<link\s+rel="icon"[^>]+href="\/favicon\.svg"/i, 'index.html must reference /favicon.svg');
requireMatch(html, /<link\s+rel="manifest"[^>]+href="\/site\.webmanifest"/i, 'index.html must reference /site.webmanifest');
requireMatch(html, /<meta\s+name="description"\s+content="[^"]+"/i, 'index.html must contain a description');
requireMatch(html, /<meta\s+name="robots"\s+content="[^"]*noindex/i, 'closed beta must remain noindex');
requireMatch(html, /<meta\s+property="og:title"\s+content="[^"]+"/i, 'index.html must contain an Open Graph title');
requireMatch(html, /<meta\s+name="theme-color"\s+content="#[0-9a-f]{6}"/i, 'index.html must contain a theme color');

if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?:\D|$)/i.test(html)) {
  failures.push('viewport must allow user zoom');
}

for (const requiredFile of ['favicon.svg', 'site.webmanifest', 'robots.txt']) {
  if (!await exists(join(publicRoot, requiredFile))) failures.push(`public/${requiredFile} is missing`);
}

if (await exists(join(publicRoot, 'sitemap.xml'))) {
  failures.push('closed beta must not publish a sitemap before its canonical domain is configured');
}

const manifest = JSON.parse(await readFile(join(publicRoot, 'site.webmanifest'), 'utf8'));
if (manifest.name !== 'Human World' || manifest.start_url !== '/' || manifest.display !== 'standalone') {
  failures.push('site.webmanifest identity or launch settings are invalid');
}

for (const icon of manifest.icons ?? []) {
  if (typeof icon.src !== 'string' || !icon.src.startsWith('/')) {
    failures.push('manifest icon paths must be root-relative');
    continue;
  }
  if (!await exists(join(publicRoot, icon.src.slice(1)))) failures.push(`manifest icon is missing: ${icon.src}`);
}

for (const file of [join(root, 'index.html'), ...await listTextFiles(publicRoot)]) {
  const content = await readFile(file, 'utf8');
  if (/portugaltravelhub\.com/i.test(content)) failures.push(`unrelated legacy domain found in ${file}`);
}

if (failures.length > 0) {
  console.error('Public shell verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public shell verification passed (identity, install metadata, accessibility and closed-beta indexing).');
}
