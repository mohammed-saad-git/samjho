import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const stagedOnly = process.argv.includes('--staged');
const repoRoot = process.cwd();

const SECRET_PATTERNS = [
  {
    name: 'Google / Gemini API key',
    regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  },
  {
    name: 'Supabase secret key',
    regex: /\bsb_secret_[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: 'Signed JWT token literal',
    regex: /\beyJhbGciOi[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\b/g,
  },
  {
    name: 'Hardcoded GEMINI_API_KEY assignment',
    regex: /\bGEMINI_API_KEY\s*[:=]\s*['"]?(?!<|your-|placeholder|\$\{)[A-Za-z0-9_-]{12,}/g,
  },
];

const SERVICE_ROLE_USAGE_RE = /\bSUPABASE_SERVICE_ROLE_KEY\b/g;

const IGNORED_EXT = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.ico', '.woff2', '.woff']);
const IGNORED_PATHS = new Set([
  'public/pdf.worker.min.mjs',
  'package-lock.json',
  'scripts/check-secrets.mjs',
]);

function getFilesToScan() {
  const args = stagedOnly
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACM']
    : ['ls-files', '--cached', '--others', '--exclude-standard'];
  try {
    const trackedOrWork = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
    const trackedEnv = stagedOnly
      ? ''
      : execFileSync('git', ['ls-files', '.env', '.env.*'], { cwd: repoRoot, encoding: 'utf8' });
    const all = new Set(
      `${trackedOrWork}\n${trackedEnv}`
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return Array.from(all);
  } catch {
    return [];
  }
}

function main() {
  const files = getFilesToScan();
  const violations = [];

  for (const relPath of files) {
    const normalized = relPath.replace(/\\/g, '/');

    if (
      normalized === '.env' ||
      normalized === '.env.local' ||
      (normalized.startsWith('.env.') && normalized !== '.env.example')
    ) {
      violations.push(`${normalized}: real env file must never be staged or tracked in git`);
      continue;
    }

    if (IGNORED_PATHS.has(normalized) || IGNORED_EXT.has(path.extname(normalized).toLowerCase())) {
      continue;
    }

    const absPath = path.join(repoRoot, normalized);
    if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(absPath, 'utf8');

    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(content)) {
        violations.push(`${normalized}: potential ${pattern.name} detected`);
      }
    }

    // Never allow SUPABASE_SERVICE_ROLE_KEY in app code, components, lib, or supabase functions
    if (
      normalized.startsWith('app/') ||
      normalized.startsWith('components/') ||
      normalized.startsWith('lib/') ||
      normalized.startsWith('supabase/')
    ) {
      SERVICE_ROLE_USAGE_RE.lastIndex = 0;
      if (SERVICE_ROLE_USAGE_RE.test(content)) {
        violations.push(`${normalized}: SUPABASE_SERVICE_ROLE_KEY must not be referenced in code`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('Secret check failed:');
    for (const v of violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }

  console.log(`Secret check passed (${files.length} ${stagedOnly ? 'staged' : 'tracked'} files).`);
}

main();
