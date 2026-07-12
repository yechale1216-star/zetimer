const fs = require('fs');
const file = 'c:/yechale file/zetime/zetimer/server/src/utils/email.ts';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings for matching
const normalized = content.replace(/\r\n/g, '\n');

const oldBlock = `const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
let EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
let EMAIL_SECURE = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : (EMAIL_PORT === 465);
const EMAIL_USER = process.env.EMAIL_USER || 'yechale1216@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ttcmdoaazznhlavr';

// Auto-correction for Render hosting environment:
// Outbound SMTP on port 465 is blocked by Render's firewall.
if (process.env.RENDER && EMAIL_PORT === 465) {
  console.warn('[SMTP Setup] Outgoing mail port 465 is blocked by Render. Redirecting connection to port 587.');
  EMAIL_PORT = 587;
  EMAIL_SECURE = false;
}`;

const newBlock = `const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_USER = process.env.EMAIL_USER || 'yechale1216@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ttcmdoaazznhlavr';

// Render blocks outbound SMTP on ports 25 and 465.
// Always force port 587 (STARTTLS) when running on Render,
// regardless of what EMAIL_PORT env var is configured to.
const SMTP_BLOCKED_PORTS = [25, 465];
const rawSmtpPort = parseInt(process.env.EMAIL_PORT || '587');
const isRenderEnv = !!process.env.RENDER;

let EMAIL_PORT;
let EMAIL_SECURE;

if (isRenderEnv && (isNaN(rawSmtpPort) || SMTP_BLOCKED_PORTS.includes(rawSmtpPort))) {
  console.warn('[SMTP Setup] Render env: overriding blocked port to 587 (STARTTLS).');
  EMAIL_PORT = 587;
  EMAIL_SECURE = false;
} else {
  EMAIL_PORT = isNaN(rawSmtpPort) ? 587 : rawSmtpPort;
  EMAIL_SECURE = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === 'true'
    : (EMAIL_PORT === 465);
}`;

if (!normalized.includes(oldBlock)) {
  console.error('OLD BLOCK NOT FOUND - no changes made.');
  process.exit(1);
}

// Replace and restore CRLF
const patched = normalized.replace(oldBlock, newBlock).replace(/\n/g, '\r\n');
fs.writeFileSync(file, patched, 'utf8');
console.log('email.ts patched successfully!');
