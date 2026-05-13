import { useMemo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useProject } from '../store/project';
import { parseTeXLog } from '@jtex/shared';

export function StatusBar() {
  const compile = useProject((s) => s.compile);
  const engine = useProject((s) => s.engine);
  const lastSavedAt = useProject((s) => s.lastSavedAt);

  const parsed = useMemo(() => {
    if (compile.status === 'success' || compile.status === 'error' || compile.status === 'timeout') {
      return parseTeXLog(compile.log);
    }
    return null;
  }, [compile]);

  const compiling = compile.status === 'compiling';
  const isOk = compile.status === 'success' && (parsed?.errorCount ?? 0) === 0;
  const isErr = compile.status === 'error' || compile.status === 'timeout' || compile.status === 'network_error' || compile.status === 'invalid';

  const recent = useMemo(() => {
    if (!parsed) return [] as { tag: string; msg: string }[];
    const interesting = parsed.lines.filter((l) => l.kind !== 'info').slice(-3);
    if (interesting.length > 0) return interesting.map((l) => ({ tag: l.kind, msg: l.message }));
    return parsed.lines.slice(-2).map((l) => ({ tag: l.kind, msg: l.message }));
  }, [parsed]);

  return (
    <footer className="statusbar">
      <div className="status-left">
        <span className={'status-pill ' + (isErr ? 'status-pill-err' : isOk ? 'status-pill-ok' : '')}>
          {compiling ? <span className="spinner" /> : isErr ? <AlertTriangle size={11} /> : <Check size={11} />}
          {compiling ? 'Compiling' : isErr ? 'Build error' : isOk ? 'Build OK' : 'Idle'}
        </span>
        {parsed && parsed.warningCount > 0 && (
          <span className="status-pill status-pill-warn">
            <AlertTriangle size={10} /> {parsed.warningCount} warning{parsed.warningCount === 1 ? '' : 's'}
          </span>
        )}
        {parsed && parsed.errorCount > 0 && (
          <span className="status-pill status-pill-err">{parsed.errorCount} error{parsed.errorCount === 1 ? '' : 's'}</span>
        )}
        <span className="status-pill">{engine}</span>
      </div>

      <div className="status-log">
        {recent.map((l, i) => (
          <div key={i} className={'log-line log-' + l.tag}>
            <span className="log-tag">{l.tag.toUpperCase()}</span>
            <span className="log-msg">{l.msg}</span>
          </div>
        ))}
      </div>

      <div className="status-right">
        <span className="status-pill" title="Cambios guardados en memoria de la pestaña.">
          {lastSavedAt ? `Auto-save · ${relative(lastSavedAt)}` : 'Sin cambios'}
        </span>
      </div>
    </footer>
  );
}

function relative(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
