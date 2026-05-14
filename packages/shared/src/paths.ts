import { z } from 'zod';
import { LIMITS } from './limits.js';

export const ALLOWED_EXTENSIONS = [
  'tex',
  'bib',
  'cls',
  'sty',
  'bst',
  'tikz',
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'eps',
  'svg',
] as const;

const ALLOWED_EXT_RE = new RegExp(`\\.(${ALLOWED_EXTENSIONS.join('|')})$`, 'i');

const TEXT_EXTENSIONS = new Set(['tex', 'bib', 'cls', 'sty', 'bst', 'tikz']);

export function isTextPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return !!ext && TEXT_EXTENSIONS.has(ext);
}

export type PathError =
  | 'empty'
  | 'too_long'
  | 'absolute'
  | 'parent_segment'
  | 'control_chars'
  | 'empty_segment'
  | 'bad_extension';

export function validateRelativePath(
  input: string,
): { ok: true; path: string } | { ok: false; error: PathError } {
  if (!input) return { ok: false, error: 'empty' };
  if (input.length > LIMITS.maxPathLength) return { ok: false, error: 'too_long' };
  if (input.startsWith('/') || input.startsWith('\\')) return { ok: false, error: 'absolute' };
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(input)) return { ok: false, error: 'control_chars' };

  const normalized = input.replace(/\\/g, '/');
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '') return { ok: false, error: 'empty_segment' };
    if (seg === '..') return { ok: false, error: 'parent_segment' };
  }
  if (!ALLOWED_EXT_RE.test(normalized)) return { ok: false, error: 'bad_extension' };

  return { ok: true, path: normalized };
}

export const RelativePath = z.string().superRefine((val, ctx) => {
  const r = validateRelativePath(val);
  if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid path: ${r.error}` });
});
