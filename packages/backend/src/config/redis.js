import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let client = null;

// ─── In-memory fallback ───────────────────────────────────────────────────────
const memStore = new Map();

function memSet(key, seconds, value) {
  memStore.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
}
function memGet(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.value;
}
function memDel(key) { memStore.delete(key); }

// ─── No-op stub for getRedis() callers ───────────────────────────────────────
const noop = async () => null;
const stub = new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'duplicate') return () => stub;
    if (prop === 'status')    return 'stub';
    return noop;
  },
});

// ─── Check if client is actually usable ──────────────────────────────────────
function isClientReady() {
  return client !== null && client.status === 'ready';
}

export async function connectRedis() {
  try {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        // Retry up to 3 times with 1s delay, then give up (use memStore)
        if (times > 3) return null;
        return 1000;
      },
      lazyConnect: true,
      enableReadyCheck: true,
    });

    // Handle disconnects gracefully — don't crash the process
    client.on('error', (err) => {
      logger.warn(`⚠️  Redis error: ${err.message} — falling back to in-memory`);
    });

    client.on('close', () => {
      logger.warn('⚠️  Redis connection closed — falling back to in-memory');
    });

    client.on('reconnecting', () => {
      logger.info('🔄  Redis reconnecting…');
    });

    client.on('ready', () => {
      logger.info('✅  Redis reconnected and ready');
    });

    await client.connect();
    logger.info('✅  Redis connected');
  } catch (err) {
    logger.warn(`⚠️  Redis unavailable (${err.message}) — using in-memory fallback`);
    client = null;
  }
}

export function getRedis() {
  return isClientReady() ? client : stub;
}

export function isRedisConnected() {
  return isClientReady();
}

// ─── Safe helpers — NEVER throw on Redis failure, always fall back ────────────
export async function setEx(key, seconds, value) {
  if (isClientReady()) {
    try {
      return await client.setex(key, seconds, JSON.stringify(value));
    } catch (err) {
      logger.warn(`Redis setEx failed for "${key}": ${err.message} — using memStore`);
    }
  }
  memSet(key, seconds, value);
}

export async function getKey(key) {
  if (isClientReady()) {
    try {
      const raw = await client.get(key);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    } catch (err) {
      logger.warn(`Redis getKey failed for "${key}": ${err.message} — using memStore`);
    }
  }
  return memGet(key);
}

export async function delKey(key) {
  if (isClientReady()) {
    try {
      return await client.del(key);
    } catch (err) {
      logger.warn(`Redis delKey failed for "${key}": ${err.message} — using memStore`);
    }
  }
  memDel(key);
}
