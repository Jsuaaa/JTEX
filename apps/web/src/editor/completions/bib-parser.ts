import type { BibEntry } from './types';

const ENTRY_START_RE = /@(\w+)\s*\{\s*([^,\s}]+)\s*,/g;
const FIELD_RES: Record<keyof Pick<BibEntry, 'title' | 'author' | 'year'>, RegExp> = {
  title: /\btitle\s*=\s*[{"]([^"}]*)[}"]/i,
  author: /\bauthor\s*=\s*[{"]([^"}]*)[}"]/i,
  year: /\byear\s*=\s*[{"]?(\d{4})[}"]?/i,
};

export function parseBib(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  if (!content) return entries;

  const stripped = stripComments(content);
  ENTRY_START_RE.lastIndex = 0;

  const matches: { type: string; key: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = ENTRY_START_RE.exec(stripped)) !== null) {
    matches.push({
      type: (m[1] ?? '').toLowerCase(),
      key: m[2] ?? '',
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    if (!cur) continue;
    if (cur.type === 'string' || cur.type === 'preamble' || cur.type === 'comment') continue;
    if (!cur.key) continue;

    const next = matches[i + 1];
    const body = stripped.slice(cur.end, next ? next.start : undefined);
    const closing = findClosingBrace(body);
    const fieldsText = closing === -1 ? body : body.slice(0, closing);

    const entry: BibEntry = { key: cur.key, type: cur.type };
    const t = FIELD_RES.title.exec(fieldsText);
    if (t && t[1]) entry.title = cleanField(t[1]);
    const a = FIELD_RES.author.exec(fieldsText);
    if (a && a[1]) entry.author = cleanField(a[1]);
    const y = FIELD_RES.year.exec(fieldsText);
    if (y && y[1]) entry.year = y[1];

    entries.push(entry);
  }

  return entries;
}

function stripComments(content: string): string {
  const lines = content.split(/\r?\n/);
  return lines
    .map((line) => {
      const idx = line.indexOf('%');
      if (idx === -1) return line;
      if (idx > 0 && line[idx - 1] === '\\') return line;
      return line.slice(0, idx);
    })
    .join('\n');
}

function findClosingBrace(text: string): number {
  let depth = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function cleanField(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[{}]/g, '').trim();
}
