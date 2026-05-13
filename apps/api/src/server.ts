import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { registerHealth } from './routes/health.js';
import { registerCompile } from './routes/compile.js';
import { LIMITS } from '@jtex/shared';
import { statSync } from 'node:fs';

export async function buildServer() {
  const app = Fastify({
    logger: config.isProduction
      ? { level: 'info' }
      : { level: 'debug', transport: { target: 'pino-pretty' } },
    bodyLimit: LIMITS.maxProjectBytes + 1024 * 1024,
    trustProxy: true,
  });

  await app.register(rateLimit, {
    global: false,
    max: 1000,
    timeWindow: '15 minutes',
  });

  await app.register(multipart, {
    limits: {
      fileSize: LIMITS.maxProjectBytes,
      files: LIMITS.maxFileCount,
      fields: 8,
    },
  });

  registerHealth(app);
  registerCompile(app);

  if (config.servePublic) {
    try {
      const stat = statSync(config.publicDir);
      if (stat.isDirectory()) {
        await app.register(fastifyStatic, {
          root: config.publicDir,
          prefix: '/',
          wildcard: false,
        });
        app.setNotFoundHandler((req, reply) => {
          if (req.url.startsWith('/api/')) {
            return reply.status(404).send({ error: 'not found' });
          }
          return reply.sendFile('index.html');
        });
      }
    } catch {
      app.log.warn({ publicDir: config.publicDir }, 'public dir not found; SPA serving disabled');
    }
  }

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info({ port: config.port }, 'jtex api listening');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
