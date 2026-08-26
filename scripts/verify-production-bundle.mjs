import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const bundleRoot = resolve('dist');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.txt']);
const forbiddenPatterns = [
  { label: 'Supabase server environment name', pattern: /SUPABASE_(?:SERVICE_ROLE_KEY|URL)/i },
  { label: 'Supabase service-role identifier', pattern: /service[_-]?role/i },
  { label: 'direct Supabase browser dependency', pattern: /@supabase\/supabase-js/i },
  { label: 'direct Supabase client construction', pattern: /createClient\s*\(/ },
  { label: 'production admin UI environment bypass', pattern: /VITE_ENABLE_ADMIN_PANEL/i },
];

async function listTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTextFiles(path);
    return textExtensions.has(extname(entry.name)) ? [path] : [];
  }));
  return files.flat();
}

const violations = [];

for (const file of await listTextFiles(bundleRoot)) {
  const content = await readFile(file, 'utf8');
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      violations.push(`${relative(bundleRoot, file)}: ${forbidden.label}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Production bundle safety scan failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Production bundle safety scan passed (0 forbidden credential/client patterns).');
}
