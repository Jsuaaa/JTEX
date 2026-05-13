export const LIMITS = {
  maxProjectBytes: 50 * 1024 * 1024,
  maxFileCount: 200,
  maxPathLength: 255,
  compileTimeoutMs: 60_000,
  maxConcurrentCompiles: 2,
  rateLimit: {
    compile: { max: 30, windowMs: 15 * 60_000 },
  },
} as const;
