/**
 * redis.ts — Shared Redis clients for Socket.IO adapter, caching, and state.
 *
 * Upstash TLS support: when REDIS_URL starts with `rediss://`, TLS is enabled
 * automatically via the `tls: {}` option so ioredis verifies the Upstash cert.
 *
 * Graceful degradation: if Redis is not available, the server still works as
 * a single-instance deployment. All cache helpers fall back to an in-memory Map.
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Detect TLS — Upstash uses `rediss://` scheme
const isTLS = REDIS_URL.startsWith('rediss://');

let _redisAvailable = false;
export const isRedisAvailable = () => _redisAvailable;

/** Silently absorb all errors on a Redis client so Node never crashes */
function suppressErrors(client: Redis, name: string) {
  client.on('error', (err) => {
    if (process.env.REDIS_DEBUG === 'true') {
      console.warn(`[Redis:${name}] ${err.message}`);
    }
  });
}

function createClient(name: string): Redis {
  const client = new Redis(REDIS_URL, {
    lazyConnect:          true,
    enableOfflineQueue:   false, // Reject commands immediately when disconnected
    maxRetriesPerRequest: 0,     // No per-command retries — prevents queued crashes
    retryStrategy(times) {
      if (times > 3) return null; // Give up after 3 reconnect attempts
      return Math.min(times * 500, 2000);
    },
    reconnectOnError: () => false,
    // Required for Upstash TLS (rediss://) — enables certificate verification
    ...(isTLS ? { tls: {} } : {}),
  });

  suppressErrors(client, name);
  client.on('connect', () => console.log(`[Redis:${name}] Connected${isTLS ? ' (TLS)' : ''}.`));
  client.on('close',   () => { _redisAvailable = false; });

  return client;
}

export const pubClient = createClient('pub');
export const subClient = createClient('sub');

/**
 * Connect both clients. Call this once at startup before initializing Socket.IO.
 * Returns true if Redis is available, false if it should be skipped.
 */
export async function connectRedis(): Promise<boolean> {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    _redisAvailable = true;
    console.log('[Redis] Both clients ready. Multi-instance broadcasting ENABLED.');
    return true;
  } catch (err: any) {
    _redisAvailable = false;
    // Disconnect fully to stop all retry loops — server runs in single-instance mode
    try { pubClient.disconnect(); } catch { /* ignore */ }
    try { subClient.disconnect(); } catch { /* ignore */ }
    console.warn(`[Redis] Not available (${err.message}). Running in single-instance mode.`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Cache Layer (Redis with in-memory fallback)
// ─────────────────────────────────────────────────────────────────────────────
const memCache = new Map<string, { value: string; expires: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  if (_redisAvailable) {
    try {
      return await pubClient.get(key);
    } catch {
      // Fall through to memory cache on Redis error
    }
  }
  const item = memCache.get(key);
  if (item) {
    if (item.expires > Date.now()) return item.value;
    memCache.delete(key);
  }
  return null;
}

export async function cacheSetEx(key: string, seconds: number, value: string): Promise<void> {
  if (_redisAvailable) {
    try {
      await pubClient.setex(key, seconds, value);
      return;
    } catch {
      // Fall through to memory cache on Redis error
    }
  }
  memCache.set(key, { value, expires: Date.now() + seconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  if (_redisAvailable) {
    try {
      await pubClient.del(key);
    } catch {
      // Fall through to memory on Redis error
    }
  }
  memCache.delete(key);
}

// Periodic cleanup for the in-memory fallback cache (runs only when Redis is down)
setInterval(() => {
  if (_redisAvailable) return;
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (v.expires < now) memCache.delete(k);
  }
}, 60_000);
