import { unzip, zip, strFromU8 } from 'fflate';
import type { FileEntry } from '../store/project';
import { validateRelativePath, isTextPath } from '@jtex/shared';

export async function unzipProject(buffer: Uint8Array): Promise<{ files: FileEntry[]; skipped: string[] }> {
  return new Promise((resolve, reject) => {
    unzip(buffer, (err, decoded) => {
      if (err) return reject(err);
      const files: FileEntry[] = [];
      const skipped: string[] = [];
      const now = Date.now();
      for (const [rawPath, bytes] of Object.entries(decoded)) {
        if (rawPath.endsWith('/')) continue;
        const stripped = rawPath.replace(/^[^/]+\/(?=.+)/, (m) => (Object.keys(decoded).every((k) => k.startsWith(m)) ? '' : m));
        const v = validateRelativePath(stripped);
        if (!v.ok) { skipped.push(rawPath); continue; }
        if (isTextPath(v.path)) {
          files.push({ kind: 'text', path: v.path, content: strFromU8(bytes), updatedAt: now });
        } else {
          files.push({ kind: 'binary', path: v.path, bytes, updatedAt: now });
        }
      }
      resolve({ files, skipped });
    });
  });
}

export async function zipProject(files: FileEntry[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const payload: Record<string, Uint8Array> = {};
    for (const f of files) {
      payload[f.path] = f.kind === 'text' ? new TextEncoder().encode(f.content) : f.bytes;
    }
    zip(payload, { level: 6 }, (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
  });
}
