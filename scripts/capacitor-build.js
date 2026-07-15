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

function renameSyncWithRetry(src, dest, retries = 10, delay = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        return true;
      }
      return false;
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EBUSY') {
        if (i === retries - 1) {
          try {
            console.log(`[cap-build] Rename locked persistently. Falling back to copy-then-delete sync...`);
            fs.cpSync(src, dest, { recursive: true });
            fs.rmSync(src, { recursive: true, force: true });
            return true;
          } catch (fallbackErr) {
            console.error(`[cap-build] Fallback copy/delete failed:`, fallbackErr);
            throw err;
          }
        }
        console.log(`[cap-build] Rename locked, retrying in ${delay}ms... (${i + 1}/${retries})`);
        // Synchronous block sleep
        const limit = Date.now() + delay;
        while (Date.now() < limit) {}
      } else {
        throw err;
      }
    }
  }
}

let renamed = false;

// ── 1. Hide the api folder ────────────────────────────────────────────────────
if (fs.existsSync(API_DIR)) {
  renameSyncWithRetry(API_DIR, API_TMP);
  renamed = true;
  console.log('[cap-build] Temporarily hidden: app/api → app/__api_cap_disabled');
}

// ── 2. Run Next.js static export ─────────────────────────────────────────────
let buildFailed = false;
try {
  console.log('\n[cap-build] Running: next build --webpack (CAPACITOR_BUILD=1)…\n');
  execSync('npx next build --webpack', {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_BUILD: '1' },
    cwd: ROOT,
  });
  console.log('\n[cap-build] ✓ Build succeeded');
} catch (err) {
  buildFailed = true;
  console.error('\n[cap-build] ✗ Build FAILED');
}

// ── 3. Restore api folder (always) ───────────────────────────────────────────
if (renamed && fs.existsSync(API_TMP)) {
  renameSyncWithRetry(API_TMP, API_DIR);
  console.log('[cap-build] Restored: app/__api_cap_disabled → app/api');
}

if (buildFailed) process.exit(1);
