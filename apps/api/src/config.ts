import { LIMITS } from '@jtex/shared';

const envNum = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: envNum('PORT', 3000),
  host: process.env.HOST ?? '0.0.0.0',
  jobsDir: process.env.JOBS_DIR ?? '/tmp/jtex-jobs',
  publicDir: process.env.PUBLIC_DIR ?? new URL('../public', import.meta.url).pathname,
  servePublic: process.env.SERVE_PUBLIC !== 'false',
  maxConcurrent: envNum('MAX_CONCURRENT_COMPILES', LIMITS.maxConcurrentCompiles),
  compileTimeoutMs: envNum('COMPILE_TIMEOUT_MS', LIMITS.compileTimeoutMs),
  maxProjectBytes: envNum('MAX_PROJECT_BYTES', LIMITS.maxProjectBytes),
  queueWaitCap: envNum('QUEUE_WAIT_CAP', 10),
  isProduction: process.env.NODE_ENV === 'production',
};
