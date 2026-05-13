import { useEffect, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { useProject } from './store/project';
import { useSettings } from './store/settings';
import { compileProject } from './lib/compile-client';
import { buildSampleProject } from './lib/sample-project';

export function App() {
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const project = useProject();
  const hasProject = project.files.size > 0;

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = settings.theme;
    r.dataset.density = settings.density;
    r.dataset.paper = settings.paperTone;
    r.style.setProperty('--accent', settings.accent);
    r.style.setProperty('--editor-font', `'${settings.editorFont} Variable', '${settings.editorFont}', ui-monospace, monospace`);
    r.style.setProperty('--show-lns', settings.showLineNumbers ? 'block' : 'none');
  }, [settings.theme, settings.density, settings.paperTone, settings.accent, settings.editorFont, settings.showLineNumbers]);

  useEffect(() => {
    if (!hasProject) {
      const sample = buildSampleProject();
      useProject.getState().loadProject(sample);
    }
  }, [hasProject]);

  const runCompile = useCallback(async () => {
    const state = useProject.getState();
    if (!state.entryFile) {
      state.setCompile({ status: 'invalid', reason: 'No hay archivo principal seleccionado.' });
      return;
    }
    state.setCompile({ status: 'compiling', startedAt: Date.now() });
    const files = Array.from(state.files.values());
    const result = await compileProject({ files, entryFile: state.entryFile, engine: state.engine });
    const finishedAt = Date.now();
    if (result.status === 'success') {
      state.setCompile({ status: 'success', pdfBlob: result.pdf, log: result.log, durationMs: result.durationMs, finishedAt });
    } else if (result.status === 'error') {
      state.setCompile({ status: 'error', log: result.log, errorSummary: result.errorSummary, finishedAt });
    } else if (result.status === 'timeout') {
      state.setCompile({ status: 'timeout', log: result.log, finishedAt });
    } else if (result.status === 'invalid') {
      state.setCompile({ status: 'invalid', reason: result.reason });
    } else if (result.status === 'rate_limited') {
      state.setCompile({ status: 'network_error', reason: 'Demasiadas compilaciones. Intentá en unos minutos.' });
    } else if (result.status === 'busy') {
      state.setCompile({ status: 'network_error', reason: 'Servidor ocupado. Intentá de nuevo.' });
    } else {
      state.setCompile({ status: 'network_error', reason: result.reason });
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCompile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        runCompile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runCompile]);

  const compiling = project.compile.status === 'compiling';

  return (
    <div className="app">
      <TopBar
        projectName={project.name}
        activeFile={project.activeFile}
        compiling={compiling}
        autoCompile={settings.autoCompile}
        onToggleAuto={() => settings.set('autoCompile', !settings.autoCompile)}
        onCompile={runCompile}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="workspace">
        <Sidebar onCompile={runCompile} />
        <PanelGroup direction="horizontal" autoSaveId="jtex-split" style={{ gridColumn: '2 / 5' }}>
          <Panel defaultSize={50} minSize={20}>
            <EditorPane />
          </Panel>
          <PanelResizeHandle className="splitter" />
          <Panel defaultSize={50} minSize={20}>
            <PreviewPane onCompile={runCompile} />
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
