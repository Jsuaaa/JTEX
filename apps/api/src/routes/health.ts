import type { FastifyInstance } from 'fastify';
import { spawn } from 'node:child_process';

let cachedTectonicVersion: string | null = null;

async function getTectonicVersion(): Promise<string> {
  if (cachedTectonicVersion !== null) return cachedTectonicVersion;
  return new Promise((resolve) => {
    try {
      const proc = spawn('tectonic', ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let out = '';
      proc.stdout.on('data', (c) => { out += c.toString('utf8'); });
      proc.on('error', () => { cachedTectonicVersion = 'not-available'; resolve(cachedTectonicVersion); });
      proc.on('close', () => {
        cachedTectonicVersion = out.trim() || 'unknown';
        resolve(cachedTectonicVersion);
      });
    } catch {
      cachedTectonicVersion = 'not-available';
      resolve(cachedTectonicVersion);
    }
  });
}

export function registerHealth(app: FastifyInstance): void {
  app.get('/api/health', async () => {
    const tectonic = await getTectonicVersion();
    return { ok: true, version: '0.1.0', tectonic };
  });
}
