import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CompileOutcome =
  | { kind: 'success'; pdf: Buffer; log: string; durationMs: number; engineUsed: string }
  | { kind: 'error'; log: string; durationMs: number; engineUsed: string }
  | { kind: 'timeout'; log: string; durationMs: number; engineUsed: string };

export type CompileOptions = {
  jobDir: string;
  entryFile: string;
  engine: 'tectonic' | 'pdflatex' | 'xelatex' | 'lualatex';
  timeoutMs: number;
};

type Strategy = { cmd: string; args: string[]; label: string };

export async function compileLatex(opts: CompileOptions): Promise<CompileOutcome> {
  const start = Date.now();
  const { jobDir, entryFile, engine, timeoutMs } = opts;

  let entryContent = '';
  try {
    entryContent = await readFile(path.join(jobDir, entryFile), 'utf8');
  } catch {
    /* main file missing — compiler will produce the right error */
  }

  const strategy = decideStrategy(entryContent, engine, entryFile);

  let stdout = '';
  let stderr = '';

  const result = await new Promise<{ code: number | null; timedOut: boolean }>((resolve) => {
    const proc = spawn(strategy.cmd, strategy.args, {
      cwd: jobDir,
      env: {
        ...process.env,
        HOME: jobDir,
        TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR ?? '/var/cache/tectonic',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    proc.stderr.on('data', (c) => { stderr += c.toString('utf8'); });

    proc.on('error', () => { clearTimeout(timer); resolve({ code: -1, timedOut }); });
    proc.on('close', (code) => { clearTimeout(timer); resolve({ code, timedOut }); });
  });

  const durationMs = Date.now() - start;
  const pdfPath = path.join(jobDir, replaceExt(entryFile, '.pdf'));
  const logPath = path.join(jobDir, replaceExt(entryFile, '.log'));

  let logFromFile = '';
  try { logFromFile = await readFile(logPath, 'utf8'); } catch { /* may not exist */ }

  const log = logFromFile || stdout || stderr || '(no log produced)';

  if (result.timedOut) {
    return { kind: 'timeout', log, durationMs, engineUsed: strategy.label };
  }

  // Check for a non-empty PDF regardless of exit code: latexmk often returns
  // non-zero on missing citations / undefined refs while still producing a
  // valid PDF, and that matches what most LaTeX editors call "success".
  try {
    const pdf = await readFile(pdfPath);
    if (pdf.length > 0) {
      return { kind: 'success', pdf, log, durationMs, engineUsed: strategy.label };
    }
  } catch { /* no PDF produced */ }

  return { kind: 'error', log, durationMs, engineUsed: strategy.label };
}

function decideStrategy(content: string, requestedEngine: CompileOptions['engine'], entryFile: string): Strategy {
  const magic = /^%\s*!\s*TEX\s+(?:TS-)?program\s*=\s*(\w+)/im.exec(content);
  const usesFontspec = /\\usepackage(?:\s*\[[^\]]*\])?\s*\{fontspec\}/.test(content);
  const usesBiblatex = /\\usepackage(?:\s*\[[^\]]*\])?\s*\{biblatex\}/.test(content);
  const usesBibtex = /\\bibliographystyle\s*\{|\\bibliography\s*\{/.test(content);
  const usesPolyglossia = /\\usepackage(?:\s*\[[^\]]*\])?\s*\{polyglossia\}/.test(content);
  const usesLuaPackage = /\\usepackage(?:\s*\[[^\]]*\])?\s*\{(luacode|luatextra|lua-ul)\}/.test(content);

  let resolvedEngine: 'pdflatex' | 'xelatex' | 'lualatex';
  if (magic) {
    const m = (magic[1] ?? '').toLowerCase();
    resolvedEngine = m === 'xelatex' || m === 'lualatex' ? m : 'pdflatex';
  } else if (usesLuaPackage) {
    resolvedEngine = 'lualatex';
  } else if (usesFontspec || usesPolyglossia) {
    resolvedEngine = 'xelatex';
  } else if (requestedEngine === 'xelatex' || requestedEngine === 'lualatex' || requestedEngine === 'pdflatex') {
    resolvedEngine = requestedEngine;
  } else {
    resolvedEngine = 'pdflatex';
  }

  // Use tectonic only for simple pdflatex docs without external bibliography tooling.
  // It's faster than latexmk and downloads packages on demand, but doesn't drive biber
  // reliably (v0.15) and stops at .xdv when fontspec is involved.
  const tectonicSafe =
    requestedEngine === 'tectonic' &&
    resolvedEngine === 'pdflatex' &&
    !usesBiblatex &&
    !usesBibtex;

  if (tectonicSafe) {
    return {
      cmd: 'tectonic',
      args: ['--keep-logs', '--outdir', '.', '--reruns', '3', entryFile],
      label: 'tectonic',
    };
  }

  const engineFlag =
    resolvedEngine === 'xelatex' ? '-xelatex' :
    resolvedEngine === 'lualatex' ? '-lualatex' :
    '-pdf';

  return {
    cmd: 'latexmk',
    args: [
      engineFlag,
      '-interaction=nonstopmode',
      '-file-line-error',
      `-jobname=${path.parse(entryFile).name}`,
      entryFile,
    ],
    label: `latexmk(${resolvedEngine})`,
  };
}

function replaceExt(filename: string, newExt: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? filename + newExt : filename.slice(0, idx) + newExt;
}
