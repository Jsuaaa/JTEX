import { stripComment } from '../../lib/outline';
import type { LabelDef, LocalCommandDef } from './types';

const NEWCOMMAND_RE =
  /\\(?:newcommand|renewcommand|providecommand)\*?\s*\{\s*\\([A-Za-z@]+)\s*\}(?:\s*\[(\d+)\])?/g;
const NEWCOMMAND_BS_RE =
  /\\(?:newcommand|renewcommand|providecommand)\*?\s*\\([A-Za-z@]+)(?:\s*\[(\d+)\])?/g;
const LABEL_RE = /\\label\s*\{([^}]+)\}/g;

const VERBATIM_BEGIN_RE = /\\begin\s*\{(verbatim|lstlisting|minted)\}/;
const VERBATIM_END_RE = /\\end\s*\{(verbatim|lstlisting|minted)\}/;

export interface ScanResult {
  labels: LabelDef[];
  localCommands: LocalCommandDef[];
}

export function scanDocument(file: string, content: string): ScanResult {
  const labels: LabelDef[] = [];
  const localCommands: LocalCommandDef[] = [];
  const lines = content.split(/\r?\n/);
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
    if (!stripped) continue;

    const lineNo = i + 1;
    collectLabels(stripped, file, lineNo, labels);
    collectLocalCommands(stripped, file, lineNo, localCommands);
  }

  return { labels, localCommands };
}

function collectLabels(line: string, file: string, lineNo: number, out: LabelDef[]): void {
  LABEL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LABEL_RE.exec(line)) !== null) {
    const name = (m[1] ?? '').trim();
    if (name) out.push({ name, file, line: lineNo });
  }
}

function collectLocalCommands(
  line: string,
  file: string,
  lineNo: number,
  out: LocalCommandDef[],
): void {
  NEWCOMMAND_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NEWCOMMAND_RE.exec(line)) !== null) {
    out.push({
      name: m[1] ?? '',
      args: m[2] ? Number.parseInt(m[2], 10) : 0,
      file,
      line: lineNo,
    });
  }
  NEWCOMMAND_BS_RE.lastIndex = 0;
  while ((m = NEWCOMMAND_BS_RE.exec(line)) !== null) {
    out.push({
      name: m[1] ?? '',
      args: m[2] ? Number.parseInt(m[2], 10) : 0,
      file,
      line: lineNo,
    });
  }
}
