/**
 * send-test.js
 * Sends all compiled email templates to Mailtrap for cross-client testing.
 * Run manually: node scripts/send-test.js
 *
 * Prerequisites:
 *   1. Copy .env.example → .env and fill in your Mailtrap credentials
 *   2. Run `npm run build:emails` first to generate compiled/*.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMPILED_DIR = path.join(ROOT, 'public', 'compiled');

// Load .env manually (no dotenv dependency needed for a simple script)
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found. Copy .env.example → .env and fill in credentials.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const { MAILTRAP_HOST, MAILTRAP_PORT, MAILTRAP_USER, MAILTRAP_PASS, MAILTRAP_TO } = process.env;

if (!MAILTRAP_USER || !MAILTRAP_PASS) {
  console.error('Error: MAILTRAP_USER and MAILTRAP_PASS must be set in .env');
  process.exit(1);
}

function createTransport() {
  return nodemailer.createTransport({
    host: MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(MAILTRAP_PORT) || 2525,
    auth: { user: MAILTRAP_USER, pass: MAILTRAP_PASS },
  });
}

const SUBJECTS = {
  'newsletter':     'Acme Corp Weekly Digest — March 2026',
  'transactional':  'Your Order #AC-29471 is confirmed',
  'promotional':    '🎉 25% off everything — this weekend only',
  'welcome':        'Welcome to Acme Corp — let\'s get started',
  'password-reset': 'Reset your Acme Corp password',
};

const htmlFiles = fs.readdirSync(COMPILED_DIR).filter(f => f.endsWith('.html'));

if (htmlFiles.length === 0) {
  console.error('No compiled HTML files found. Run `npm run build:emails` first.');
  process.exit(1);
}

console.log(`\nSending ${htmlFiles.length} template(s) to Mailtrap...\n`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

for (const filename of htmlFiles) {
  const id = filename.replace('.html', '');
  const html = fs.readFileSync(path.join(COMPILED_DIR, filename), 'utf8');
  const subject = SUBJECTS[id] || `[MJML Test] ${id}`;

  const transporter = createTransport();
  try {
    const info = await transporter.sendMail({
      from: '"Acme Corp" <noreply@acmecorp.example>',
      to: MAILTRAP_TO || 'test@example.com',
      subject,
      html,
    });
    console.log(`  ✓ ${filename} — Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`  ✗ ${filename} — ${err.message}`);
  } finally {
    transporter.close();
  }
  await sleep(10000);
}

console.log('\nDone. Check your Mailtrap inbox for previews.\n');
