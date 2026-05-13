export type LogLine =
  | { kind: 'error'; message: string; file?: string; line?: number }
  | { kind: 'warning'; message: string; file?: string; line?: number }
  | { kind: 'info'; message: string }
  | { kind: 'ok'; message: string };

export type LogParseResult = {
  lines: LogLine[];
  errorCount: number;
  warningCount: number;
  errorSummary: string;
};

const ERROR_LINE_RE = /^!\s+(.+)$/;
const LINE_NUM_RE = /^l\.(\d+)\s/;
const WARN_RE = /^(LaTeX|Package|Class)\s+([\w-]+\s+)?Warning:\s+(.+)/i;
const OVERFULL_RE = /^(Overfull|Underfull)\s+\\(hbox|vbox)\s+\(([^)]+)\)\s+(.+)/i;
const OUTPUT_OK_RE = /^Output written on\s+(\S+)\s+\((.+)\)/;

export function parseTeXLog(log: string): LogParseResult {
  const rawLines = log.split(/\r?\n/);
  const lines: LogLine[] = [];
  const errorSummaryLines: string[] = [];
  let pendingError: LogLine | null = null;
  let errorCount = 0;
  let warningCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] ?? '';
    const trimmed = line.trim();
    if (!trimmed) {
      if (pendingError) {
        lines.push(pendingError);
        pendingError = null;
      }
      continue;
    }

    const errMatch = ERROR_LINE_RE.exec(line);
    if (errMatch) {
      if (pendingError) lines.push(pendingError);
      pendingError = { kind: 'error', message: errMatch[1] ?? '' };
      errorCount++;
      if (errorSummaryLines.length < 8) errorSummaryLines.push(line);
      continue;
    }

    if (pendingError) {
      const lineNumMatch = LINE_NUM_RE.exec(trimmed);
      if (lineNumMatch) pendingError.line = parseInt(lineNumMatch[1] ?? '0', 10);
      if (errorSummaryLines.length < 8) errorSummaryLines.push(line);
      lines.push(pendingError);
      pendingError = null;
      continue;
    }

    const warnMatch = WARN_RE.exec(trimmed);
    if (warnMatch) {
      warningCount++;
      lines.push({ kind: 'warning', message: `${warnMatch[1]} ${warnMatch[2] ?? ''}Warning: ${warnMatch[3]}`.trim() });
      continue;
    }

    const overfullMatch = OVERFULL_RE.exec(trimmed);
    if (overfullMatch) {
      warningCount++;
      lines.push({ kind: 'warning', message: trimmed });
      continue;
    }

    const okMatch = OUTPUT_OK_RE.exec(trimmed);
    if (okMatch) {
      lines.push({ kind: 'ok', message: trimmed });
      continue;
    }

    lines.push({ kind: 'info', message: trimmed });
  }

  if (pendingError) lines.push(pendingError);

  return {
    lines,
    errorCount,
    warningCount,
    errorSummary: errorSummaryLines.join('\n').trim() || (errorCount ? 'Compilation failed' : ''),
  };
}
