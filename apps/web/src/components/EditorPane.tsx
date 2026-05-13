import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import { Bold, Code, FileText, Image, Italic, List, Plus, Quote, Sigma, Table, X } from 'lucide-react';
import { jtexTheme, jtexHighlightExt } from '../editor/theme';
import { SNIPPETS } from '../editor/snippets';
import { useProject } from '../store/project';
import { useSettings } from '../store/settings';

export function EditorPane() {
  const project = useProject();
  const settings = useSettings();
  const file = project.activeFile ? project.files.get(project.activeFile) : null;

  if (!project.activeFile || !file) {
    return (
      <section className="editor-pane">
        <div className="no-doc">
          <div>Ningún archivo abierto.</div>
          <div className="hint">Subí un <code>.tex</code> o un <code>.zip</code> desde el panel izquierdo.</div>
        </div>
      </section>
    );
  }

  if (file.kind === 'binary') {
    return (
      <section className="editor-pane">
        <EditorTabs />
        <div className="no-doc">
          <div>{file.path}</div>
          <div className="hint">Archivo binario ({(file.bytes.byteLength / 1024).toFixed(1)} KB) — no editable acá.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="editor-pane">
      <EditorTabs />
      <EditorToolbar viewRef={viewRefForActive} />
      <CodeMirrorHost
        key={project.activeFile}
        value={file.content}
        path={project.activeFile}
        showLineNumbers={settings.showLineNumbers}
        onChange={(v) => useProject.getState().writeFile(file.path, v)}
        onCursor={setCursor}
      />
      <PositionStatus />
    </section>
  );
}

// Sharing the active EditorView between the toolbar and the host
const viewRefForActive: { current: EditorView | null } = { current: null };

function setCursor(line: number, col: number) {
  cursorRef.current = { line, col };
  for (const sub of cursorSubs) sub();
}
const cursorRef = { current: { line: 1, col: 1 } };
const cursorSubs = new Set<() => void>();

function PositionStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    cursorSubs.add(fn);
    return () => { cursorSubs.delete(fn); };
  }, []);
  return (
    <div className="pane-head-right" style={{ position: 'absolute', right: 0, top: 0, height: 36, display: 'flex', alignItems: 'center', paddingRight: 10 }}>
      <span className="ed-pos">Ln {cursorRef.current.line}, Col {cursorRef.current.col}</span>
    </div>
  );
}

function EditorTabs() {
  const project = useProject();
  return (
    <div className="pane-head">
      <div className="pane-tabs">
        {project.openTabs.map((path) => (
          <div
            key={path}
            className={'pane-tab' + (project.activeFile === path ? ' is-active' : '')}
            onClick={() => useProject.getState().setActiveFile(path)}
          >
            <FileText size={12} />
            <span>{path.split('/').pop()}</span>
            <button
              className="close"
              onClick={(e) => { e.stopPropagation(); useProject.getState().closeTab(path); }}
              aria-label={`Close ${path}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
      <div className="pane-head-right">
        <span className="ed-pos">Ln {cursorRef.current.line}, Col {cursorRef.current.col}</span>
      </div>
    </div>
  );
}

type CMHostProps = {
  value: string;
  path: string;
  showLineNumbers: boolean;
  onChange: (v: string) => void;
  onCursor: (line: number, col: number) => void;
};

function CodeMirrorHost({ value, showLineNumbers, onChange, onCursor }: CMHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const extensions = [
      history(),
      drawSelection(),
      highlightActiveLine(),
      ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
      StreamLanguage.define(stex),
      jtexTheme,
      jtexHighlightExt,
      autocompletion(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChange(u.state.doc.toString());
        if (u.selectionSet || u.docChanged) {
          const head = u.state.selection.main.head;
          const line = u.state.doc.lineAt(head);
          onCursor(line.number, head - line.from + 1);
        }
      }),
    ];
    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    viewRefForActive.current = view;
    return () => {
      view.destroy();
      if (viewRefForActive.current === view) viewRefForActive.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className="editor-cm" />;
}

function EditorToolbar({ viewRef }: { viewRef: { current: EditorView | null } }) {
  const apply = (fn: (v: EditorView) => void) => {
    const v = viewRef.current;
    if (v) fn(v);
  };
  return (
    <div className="ed-toolbar">
      <button className="ed-tool" title="Bold (\\textbf)" onClick={() => apply(SNIPPETS.bold)}>
        <Bold size={12} /><span>B</span>
      </button>
      <button className="ed-tool" title="Italic (\\textit)" onClick={() => apply(SNIPPETS.italic)}>
        <Italic size={12} /><span>I</span>
      </button>
      <span className="ed-sep" />
      <button className="ed-tool" title="Inline math" onClick={() => apply(SNIPPETS.math)}>
        <Code size={12} /><span>$x$</span>
      </button>
      <button className="ed-tool" title="Equation block" onClick={() => apply(SNIPPETS.equation)}>
        <Sigma size={12} /><span>eq</span>
      </button>
      <button className="ed-tool" title="Citation" onClick={() => apply(SNIPPETS.cite)}>
        <Quote size={12} /><span>cite</span>
      </button>
      <button className="ed-tool" title="List" onClick={() => apply(SNIPPETS.list)}>
        <List size={12} /><span>list</span>
      </button>
      <button className="ed-tool" title="Table" onClick={() => apply(SNIPPETS.table)}>
        <Table size={12} /><span>tbl</span>
      </button>
      <button className="ed-tool" title="Figure" onClick={() => apply(SNIPPETS.figure)}>
        <Image size={12} /><span>img</span>
      </button>
      <span className="ed-sep" />
      <button className="ed-tool" title="Section" onClick={() => apply(SNIPPETS.section)}>
        <Plus size={12} /><span>H1</span>
      </button>
      <button className="ed-tool" title="Subsection" onClick={() => apply(SNIPPETS.subsection)}>
        <Plus size={12} /><span>H2</span>
      </button>
      <div className="ed-tool-spacer" />
      <span className="ed-info">UTF-8 · LF · LaTeX</span>
    </div>
  );
}
