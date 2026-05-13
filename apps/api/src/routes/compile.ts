import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { unzipSync } from 'fflate';
import { Engine, LIMITS, parseTeXLog, validateRelativePath } from '@jtex/shared';
import { config } from '../config.js';
import { compileLatex } from '../lib/tectonic.js';
import { sendPdfWithLog } from '../lib/multipart-response.js';

const compileSlot = pLimit(config.maxConcurrent);

let waiting = 0;

export function registerCompile(app: FastifyInstance): void {
  app.post(
    '/api/compile',
    { config: { rateLimit: { max: LIMITS.rateLimit.compile.max, timeWindow: LIMITS.rateLimit.compile.windowMs } } },
    handler,
  );
}

async function handler(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (waiting >= config.queueWaitCap) {
    return reply.status(503).send({ status: 'busy', reason: 'queue full' });
  }
  waiting++;

  try {
    await mkdir(config.jobsDir, { recursive: true });
    const jobDir = await mkdtemp(path.join(config.jobsDir, 'job-'));

    let entryFile: string | null = null;
    let engine: Engine = 'tectonic';
    let projectBytes: Buffer | null = null;
    let failure: { code: number; body: unknown } | null = null;

    try {
      const parts = req.parts({ limits: { fileSize: config.maxProjectBytes, files: 1, fields: 8 } });

      for await (const part of parts) {
        if (failure) continue;

        if (part.type === 'field') {
          if (part.fieldname === 'entryFile' && typeof part.value === 'string') {
            entryFile = part.value;
          } else if (part.fieldname === 'engine' && typeof part.value === 'string') {
            const parsed = Engine.safeParse(part.value);
            if (parsed.success) engine = parsed.data;
          }
          continue;
        }

        if (part.type === 'file' && part.fieldname === 'project') {
          const chunks: Buffer[] = [];
          let total = 0;
          for await (const chunk of part.file) {
            chunks.push(chunk);
            total += chunk.length;
            if (total > config.maxProjectBytes) {
              failure = { code: 413, body: { status: 'invalid', reason: 'project exceeds size limit' } };
              break;
            }
          }
          if (!failure) projectBytes = Buffer.concat(chunks);
        }
      }
    } catch (err) {
      req.log.error({ err }, 'multipart parse failed');
      failure = { code: 400, body: { status: 'invalid', reason: 'failed to parse upload' } };
    }

    if (failure) {
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(failure.code).send(failure.body);
    }

    if (!projectBytes || projectBytes.length === 0) {
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(400).send({ status: 'invalid', reason: 'project archive missing' });
    }

    if (!entryFile) {
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(400).send({ status: 'invalid', reason: 'entryFile missing' });
    }

    const entryCheck = validateRelativePath(entryFile);
    if (!entryCheck.ok) {
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(400).send({ status: 'invalid', reason: `invalid entryFile: ${entryCheck.error}` });
    }

    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(new Uint8Array(projectBytes));
    } catch (err) {
      req.log.error({ err }, 'unzip failed');
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(400).send({ status: 'invalid', reason: 'archive is not a valid zip' });
    }

    let fileCount = 0;
    for (const [rawPath, bytes] of Object.entries(entries)) {
      if (rawPath.endsWith('/')) continue;
      const v = validateRelativePath(rawPath);
      if (!v.ok) {
        await rm(jobDir, { recursive: true, force: true });
        return reply.status(400).send({ status: 'invalid', reason: `invalid path in archive: ${rawPath} (${v.error})` });
      }
      fileCount++;
      if (fileCount > LIMITS.maxFileCount) {
        await rm(jobDir, { recursive: true, force: true });
        return reply.status(400).send({ status: 'invalid', reason: 'too many files in archive' });
      }
      const dest = path.join(jobDir, v.path);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
    }

    if (fileCount === 0) {
      await rm(jobDir, { recursive: true, force: true });
      return reply.status(400).send({ status: 'invalid', reason: 'archive contains no files' });
    }

    try {
      const outcome = await compileSlot(() =>
        compileLatex({
          jobDir,
          entryFile: entryCheck.path,
          engine,
          timeoutMs: config.compileTimeoutMs,
        }),
      );

      if (outcome.kind === 'success') {
        sendPdfWithLog(reply, outcome.pdf, outcome.log, outcome.durationMs);
        return;
      }

      if (outcome.kind === 'timeout') {
        return reply.status(504).send({ status: 'timeout', log: outcome.log, durationMs: outcome.durationMs });
      }

      const parsed = parseTeXLog(outcome.log);
      return reply.status(422).send({
        status: 'error',
        log: outcome.log,
        errorSummary: parsed.errorSummary || 'Compilation failed',
      });
    } finally {
      await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
    }
  } finally {
    waiting--;
  }
}
