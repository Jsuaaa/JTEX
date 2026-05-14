import type {
  Engine,
  CompileErrorBody,
  CompileTimeoutBody,
  CompileInvalidBody,
} from '@jtex/shared';
import { parseMultipartMixed } from './multipart-parser';
import { zipProject } from './zip';
import type { FileEntry } from '../store/project';

export type CompileApiResult =
  | { status: 'success'; pdf: Blob; log: string; durationMs: number }
  | (CompileErrorBody & { durationMs: number })
  | CompileTimeoutBody
  | CompileInvalidBody
  | { status: 'rate_limited' }
  | { status: 'busy' }
  | { status: 'network_error'; reason: string };

export async function compileProject(input: {
  files: FileEntry[];
  entryFile: string;
  engine: Engine;
}): Promise<CompileApiResult> {
  const zipBytes = await zipProject(input.files);
  const ab = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(ab).set(zipBytes);
  const fd = new FormData();
  fd.append('entryFile', input.entryFile);
  fd.append('engine', input.engine);
  fd.append('project', new Blob([ab], { type: 'application/zip' }), 'project.zip');

  const start = performance.now();
  let res: Response;
  try {
    res = await fetch('/api/compile', { method: 'POST', body: fd });
  } catch (err) {
    return { status: 'network_error', reason: err instanceof Error ? err.message : 'unknown' };
  }
  const durationMs = Math.round(performance.now() - start);

  if (res.status === 429) return { status: 'rate_limited' };
  if (res.status === 503) return { status: 'busy' };

  const ctype = res.headers.get('content-type') ?? '';

  if (res.ok && ctype.startsWith('multipart/')) {
    try {
      const { pdf, log } = await parseMultipartMixed(res);
      return { status: 'success', pdf, log, durationMs };
    } catch (err) {
      return {
        status: 'network_error',
        reason: err instanceof Error ? err.message : 'parse error',
      };
    }
  }

  if (ctype.includes('application/json')) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.status === 'error') return { ...(body as unknown as CompileErrorBody), durationMs };
    if (body.status === 'timeout') return body as unknown as CompileTimeoutBody;
    if (body.status === 'invalid') return body as unknown as CompileInvalidBody;
  }

  return { status: 'network_error', reason: `unexpected response ${res.status}` };
}
