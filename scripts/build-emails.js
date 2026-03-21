import node_fs from 'node:fs';
import node_path from 'node:path';
import { fileURLToPath } from 'node:url';
import mjml2html from 'mjml';

const __dirname = node_path.dirname(fileURLToPath(import.meta.url));
const ROOT = node_path.resolve(__dirname, '..');
const TEMPLATES_SRC = node_path.join(ROOT, 'src', 'templates');
const COMPILED_OUT = node_path.join(ROOT, 'public', 'compiled');
const TEMPLATES_OUT = node_path.join(ROOT, 'public', 'templates');

const LABELS = {
  'newsletter':     { label: 'Newsletter',           description: 'Weekly digest with article cards and multi-column layout' },
  'transactional':  { label: 'Order Confirmation',   description: 'Transactional receipt with item table and shipping details' },
  'promotional':    { label: 'Promotional / Sale',   description: 'Marketing email with hero image, coupon code, and product grid' },
  'welcome':        { label: 'Welcome & Onboarding', description: 'User onboarding with step-by-step guide and feature highlights' },
  'password-reset': { label: 'Password Reset',        description: 'Account security notification with prominent CTA' },
};

function ensureDir(dir) {
  if (!node_fs.existsSync(dir)) node_fs.mkdirSync(dir, { recursive: true });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

ensureDir(COMPILED_OUT);
ensureDir(TEMPLATES_OUT);

const mjmlFiles = node_fs.readdirSync(TEMPLATES_SRC).filter(f => f.endsWith('.mjml'));

if (mjmlFiles.length === 0) {
  console.error('No .mjml files found in src/templates/');
  process.exit(1);
}

const manifest = [];
let hasErrors = false;

console.log(`\nCompiling ${mjmlFiles.length} MJML template(s)...\n`);

for (const filename of mjmlFiles) {
  const id = filename.replace('.mjml', '');
  const srcPath = node_path.join(TEMPLATES_SRC, filename);
  const source = node_fs.readFileSync(srcPath, 'utf8');

  let result;
  try {
    result = mjml2html(source, {
      validationLevel: 'soft',
      filePath: srcPath,
    });
  } catch (err) {
    console.error(`  ✗ ${filename} — ${err.message}`);
    hasErrors = true;
    continue;
  }

  if (result.errors && result.errors.length > 0) {
    console.error(`  ✗ ${filename}`);
    for (const e of result.errors) {
      console.error(`    Line ${e.line}: ${e.message}`);
    }
    hasErrors = true;
    continue;
  }

  const htmlPath = node_path.join(COMPILED_OUT, `${id}.html`);
  node_fs.writeFileSync(htmlPath, result.html, 'utf8');

  // Copy MJML source for browser fetch
  node_fs.copyFileSync(srcPath, node_path.join(TEMPLATES_OUT, filename));

  const size = formatBytes(Buffer.byteLength(result.html, 'utf8'));
  console.log(`  ✓ ${filename} → compiled/${id}.html (${size})`);

  const meta = LABELS[id] ?? { label: id, description: '' };
  manifest.push({ id, label: meta.label, description: meta.description });
}

if (hasErrors) {
  console.error('\nBuild failed: MJML validation errors above must be fixed.\n');
  process.exit(1);
}

// Write manifest.json so the front-end discovers templates dynamically
const manifestPath = node_path.join(COMPILED_OUT, 'manifest.json');
node_fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n  ✓ manifest.json written (${manifest.length} templates)`);
console.log(`\nDone.\n`);
