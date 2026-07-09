#!/usr/bin/env node
/**
 * capacitor-build.js
 *
 * Prepares a static Next.js export for the Android / Capacitor build.
 *
 * Strategy: API routes with `force-dynamic` (and any other server-only
 * directives) are incompatible with `output: 'export'`. However, those
 * routes live on the remote server — they are NEVER bundled into the APK.
 * 
 * Solution: Temporarily rename `app/api` → `app/__api_cap_disabled` so
 * Next.js ignores every API route during the static export. After the build
 * (success or failure) the folder is always renamed back.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT    = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'app', 'api');
const API_TMP = path.join(ROOT, 'app', '__api_cap_disabled');

let renamed = false;

// ── 1. Hide the api folder ────────────────────────────────────────────────────
if (fs.existsSync(API_DIR)) {
  fs.renameSync(API_DIR, API_TMP);
  renamed = true;
  console.log('[cap-build] Temporarily hidden: app/api → app/__api_cap_disabled');
}

// ── 2. Run Next.js static export ─────────────────────────────────────────────
let buildFailed = false;
try {
  console.log('\n[cap-build] Running: next build (CAPACITOR_BUILD=1)…\n');
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_BUILD: '1' },
    cwd: ROOT,
  });
  console.log('\n[cap-build] ✓ Build succeeded');
} catch {
  buildFailed = true;
  console.error('\n[cap-build] ✗ Build FAILED');
}

// ── 3. Restore api folder (always) ───────────────────────────────────────────
if (renamed && fs.existsSync(API_TMP)) {
  fs.renameSync(API_TMP, API_DIR);
  console.log('[cap-build] Restored: app/__api_cap_disabled → app/api');
}

if (buildFailed) process.exit(1);
