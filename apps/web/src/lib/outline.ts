import type { FileEntry } from '../store/project';

export type OutlineEntry = {
  file: string;
  line: number;
  level: number;
  label: string;
};

type SectionRule = { re: RegExp; level: number };

const SECTION_RULES: SectionRule[] = [
  { re: /\\chapter\*?\s*\{([^}]+)\}/, level: 1 },
  { re: /\\section\*?\s*\{([^}]+)\}/, level: 1 },
  { re: /\\subsection\*?\s*\{([^}]+)\}/, level: 2 },
  { re: /\\subsubsection\*?\s*\{([^}]+)\}/, level: 3 },
  { re: /\\paragraph\*?\s*\{([^}]+)\}/, level: 3 },
];

const INPUT_RE = /\\(?:input|include|subfile)\s*\{([^}]+)\}/;

const VERBATIM_BEGIN_RE = /\\begin\s*\{(verbatim|lstlisting|minted)\}/;
const VERBATIM_END_RE = /\\end\s*\{(verbatim|lstlisting|minted)\}/;

export function parseOutline(
  files: Map<string, FileEntry>,
  rootPath: string,
): OutlineEntry[] {
  const out: OutlineEntry[] = [];
  const visited = new Set<string>();
  walk(rootPath, files, visited, out);
  return out;
}

function walk(
  path: string,
  files: Map<string, FileEntry>,
  visited: Set<string>,
  out: OutlineEntry[],
): void {
  const normalized = normalizePath(path);
  if (visited.has(normalized)) return;
  visited.add(normalized);

  const entry = resolveFile(normalized, files);
  if (!entry || entry.kind !== 'text') return;

  const lines = entry.content.split(/\r?\n/);
  const dir = dirname(entry.path);
  let inVerbatim = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';

    if (!inVerbatim && VERBATIM_BEGIN_RE.test(raw)) {
      inVerbatim = true;
      continue;
    }
    if (inVerbatim) {
      if (VERBATIM_END_RE.test(raw)) inVerbatim = false;
      continue;
    }

    const stripped = stripComment(raw);
    if (!stripped.trim()) continue;

    let matched = false;
    for (const rule of SECTION_RULES) {
      const m = rule.re.exec(stripped);
      if (m) {
        out.push({
          file: entry.path,
          line: i + 1,
          level: rule.level,
          label: cleanLabel(m[1] ?? ''),
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const inc = INPUT_RE.exec(stripped);
    if (inc) {
      const target = resolveInputPath(inc[1] ?? '', dir);
      if (target) walk(target, files, visited, out);
    }
  }
}

export function stripComment(line: string): string {
  let result = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '%') {
      result += '\\%';
      i++;
      continue;
    }
    if (ch === '%') break;
    result += ch;
  }
  return result;
}

function cleanLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim();
}

function resolveInputPath(target: string, baseDir: string): string {
  const cleaned = target.trim();
  const joined = baseDir ? `${baseDir}/${cleaned}` : cleaned;
  return normalizePath(joined);
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

function normalizePath(path: string): string {
  const parts = path.split('/');
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') {
      stack.pop();
      continue;
    }
    stack.push(p);
  }
  return stack.join('/');
}

function resolveFile(
  path: string,
  files: Map<string, FileEntry>,
): FileEntry | undefined {
  const direct = files.get(path);
  if (direct) return direct;
  if (!/\.tex$/i.test(path)) {
    const withExt = files.get(`${path}.tex`);
    if (withExt) return withExt;
  }
  return undefined;
}
