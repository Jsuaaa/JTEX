import { Download, Play, Search, Settings, SunMoon } from 'lucide-react';
import { useSettings } from '../store/settings';
import { useProject } from '../store/project';
import { zipProject } from '../lib/zip';

type TopBarProps = {
  projectName: string;
  activeFile: string | null;
  compiling: boolean;
  autoCompile: boolean;
  onToggleAuto: () => void;
  onCompile: () => void;
  onOpenSettings: () => void;
};

export function TopBar(props: TopBarProps) {
  const settings = useSettings();

  const onExportZip = async () => {
    const state = useProject.getState();
    const files = Array.from(state.files.values());
    if (files.length === 0) return;
    const bytes = await zipProject(files);
    const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
    triggerDownload(blob, `${state.name || 'project'}.zip`);
  };

  const onExportPdf = () => {
    const c = useProject.getState().compile;
    if (c.status !== 'success') return;
    triggerDownload(c.pdfBlob, `${useProject.getState().name || 'document'}.pdf`);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <span>J</span>
          <em>τ</em>
        </div>
        <div className="brand-name">JTEX</div>
      </div>

      <nav className="crumbs" aria-label="Project location">
        <span className="crumb">{props.projectName || 'untitled'}</span>
        {props.activeFile && (
          <>
            <span className="crumb-sep">/</span>
            <span className="crumb crumb-current">{props.activeFile}</span>
          </>
        )}
      </nav>

      <div className="topbar-actions">
        <button
          className={'auto-toggle' + (props.autoCompile ? ' is-on' : '')}
          onClick={props.onToggleAuto}
          aria-pressed={props.autoCompile}
          title="Auto-recompile on save"
        >
          <span className="pill" aria-hidden />
          <span>Auto</span>
        </button>

        <button
          className={'btn btn-primary' + (props.compiling ? ' is-compiling' : '')}
          onClick={props.onCompile}
          disabled={props.compiling}
        >
          {props.compiling ? <span className="spinner" /> : <Play size={12} />}
          <span>{props.compiling ? 'Compiling…' : 'Recompile'}</span>
        </button>

        <div className="btn-group">
          <button className="btn btn-ghost" onClick={onExportPdf} title="Download PDF">
            <Download size={12} />
            <span>PDF</span>
          </button>
          <button className="btn btn-ghost" onClick={onExportZip} title="Download .zip">
            <Download size={12} />
            <span>Zip</span>
          </button>
        </div>

        <button
          className="btn btn-ghost btn-icon"
          onClick={() => settings.set('theme', settings.theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <SunMoon size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={props.onOpenSettings}
          title="Settings (Cmd+,)"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
