// Main editor app — composes TopBar, Sidebar, Editor, Preview, StatusBar.

const { useState, useEffect, useRef, useMemo } = React;

// --- icons (16px) ---------------------------------------------------------
const I = {
  folder: (open) => (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      {open ? (
        <path d="M2 4.5A1 1 0 0 1 3 3.5h3l1.2 1.4h6A1 1 0 0 1 14.2 6L13.4 12a1 1 0 0 1-1 .9H3.2a1 1 0 0 1-1-.9L1.3 6" />
      ) : (
        <path d="M2 4.5A1 1 0 0 1 3 3.5h3l1.2 1.4h6A1 1 0 0 1 14.2 6v6.4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" />
      )}
    </svg>
  ),
  chevron: (open) => (
    <svg
      viewBox="0 0 16 16"
      width="10"
      height="10"
      fill="currentColor"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  ),
  file: (ext) => {
    const tint =
      { tex: 'var(--accent)', bib: '#6b8eaf', pdf: '#b86060', png: '#7aaa7a', sty: '#a87fb8' }[
        ext
      ] || 'var(--muted)';
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={tint} strokeWidth="1.2">
        <path d="M4 2.5h5l3 3v8a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
        <path d="M9 2.5V5.5h3" />
      </svg>
    );
  },
  upload: (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M8 11V3M8 3l-3 3M8 3l3 3M2.5 13.5h11" />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3 3" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M4 3l9 5-9 5V3z" />
    </svg>
  ),
  check: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 8 3.2 3.2L13 4.5" />
    </svg>
  ),
  warn: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M8 2.5 14 13H2L8 2.5Z" />
      <path d="M8 7v3" />
      <circle cx="8" cy="11.5" r=".7" fill="currentColor" />
    </svg>
  ),
  download: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M8 3v8M8 11l-3-3M8 11l3-3M2.5 13.5h11" />
    </svg>
  ),
  share: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="4" cy="8" r="1.8" />
      <circle cx="12" cy="4" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="m5.5 7 5-2.5M5.5 9l5 2.5" />
    </svg>
  ),
  bold: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M4 3h4.4c1.8 0 3 .9 3 2.4 0 1-.5 1.7-1.4 2 1.2.3 1.9 1.1 1.9 2.3 0 1.7-1.3 2.8-3.4 2.8H4V3Zm2 1.7v2.6h2c.9 0 1.4-.5 1.4-1.3 0-.8-.5-1.3-1.5-1.3H6Zm0 4.1V12h2.3c1 0 1.6-.5 1.6-1.3s-.6-1.3-1.7-1.3H6Z" />
    </svg>
  ),
  italic: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M6.5 3h5l-.2 1H9.6l-1.8 8H10l-.2 1h-5l.2-1h1.8L8.6 4H6.7L6.5 3Z" />
    </svg>
  ),
  sigma: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="M11.5 4V3h-7l3.5 5-3.5 5h7V12" />
    </svg>
  ),
  list: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M5 4h8M5 8h8M5 12h8M3 4h.01M3 8h.01M3 12h.01" />
    </svg>
  ),
  link: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M7 5 5.5 3.5a2.5 2.5 0 0 0-3.5 3.5L4 8.5M9 11l1.5 1.5a2.5 2.5 0 0 0 3.5-3.5L12.5 7.5M5.5 10.5l5-5" />
    </svg>
  ),
  table: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="2.5" y="3.5" width="11" height="9" />
      <path d="M2.5 7h11M2.5 10h11M8 3.5v9" />
    </svg>
  ),
  image: (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="2.5" y="3" width="11" height="10" rx="1" />
      <circle cx="6" cy="7" r="1.2" />
      <path d="M3 12 7 8l3 2.5L13 8" />
    </svg>
  ),
  user: (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="8" cy="6" r="2.5" />
      <path d="M3 13.5c.5-2.5 2.5-3.5 5-3.5s4.5 1 5 3.5" />
    </svg>
  ),
};

// ============================================================================
// TopBar
// ============================================================================
function TopBar({ docName, dirty, onCompile, compiling, onToggleTheme, theme }) {
  return (
    <header className="topbar" data-screen-label="TopBar">
      <div className="brand">
        <div className="brand-mark">
          <span>J</span>
          <em>τ</em>
        </div>
        <div className="brand-name">JTEX</div>
      </div>

      <nav className="crumbs">
        <span className="crumb">jtellez</span>
        <span className="crumb-sep">/</span>
        <span className="crumb">sgd-paper</span>
        <span className="crumb-sep">/</span>
        <span className="crumb crumb-current">
          {docName}
          {dirty && <i className="dirty-dot" />}
        </span>
      </nav>

      <div className="topbar-actions">
        <button
          className={'btn btn-primary' + (compiling ? ' is-compiling' : '')}
          onClick={onCompile}
        >
          {compiling ? <span className="spinner" /> : I.play}
          <span>{compiling ? 'Compiling…' : 'Recompile'}</span>
        </button>
        <div className="btn-group">
          <button className="btn btn-ghost" title="Download">
            {I.download}
            <span>Export</span>
          </button>
        </div>
        <button className="btn btn-ghost btn-icon" title="Share">
          {I.share}
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? (
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a.5.5 0 0 0-.7-.5 6 6 0 1 0 7.7 7.7.5.5 0 0 0-.5-.7Z" />
            </svg>
          )}
        </button>
        <div className="avatar">JT</div>
      </div>
    </header>
  );
}

// ============================================================================
// Sidebar — file tree + outline + upload
// ============================================================================
function FileNode({ node, depth = 0, onPick, activePath, path = '' }) {
  const [open, setOpen] = useState(node.open ?? false);
  const full = path + '/' + node.name;
  if (node.kind === 'folder') {
    return (
      <div>
        <div
          className="tree-row"
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setOpen(!open)}
        >
          <span className="tree-chev">{I.chevron(open)}</span>
          <span className="tree-icon">{I.folder(open)}</span>
          <span className="tree-label">{node.name}</span>
        </div>
        {open &&
          node.children.map((c) => (
            <FileNode
              key={c.name}
              node={c}
              depth={depth + 1}
              onPick={onPick}
              activePath={activePath}
              path={full}
            />
          ))}
      </div>
    );
  }
  const isActive = node.active || full === activePath;
  return (
    <div
      className={'tree-row tree-file' + (isActive ? ' is-active' : '')}
      style={{ paddingLeft: 8 + depth * 14 + 16 }}
      onClick={() => onPick && onPick(full)}
    >
      <span className="tree-icon">{I.file(node.ext)}</span>
      <span className="tree-label">{node.name}</span>
      {node.dirty && (
        <span className="tree-dirty" title="Unsaved changes">
          ●
        </span>
      )}
      {node.size && <span className="tree-meta">{node.size}</span>}
    </div>
  );
}

function Sidebar({ activePath, setActivePath }) {
  const [tab, setTab] = useState('files'); // files | outline
  return (
    <aside className="sidebar" data-screen-label="Sidebar">
      <div className="side-tabs">
        <button
          className={'side-tab' + (tab === 'files' ? ' is-active' : '')}
          onClick={() => setTab('files')}
        >
          Project
        </button>
        <button
          className={'side-tab' + (tab === 'outline' ? ' is-active' : '')}
          onClick={() => setTab('outline')}
        >
          Outline
        </button>
      </div>

      {tab === 'files' && (
        <div className="side-body">
          <div className="side-actions">
            <button className="side-btn">
              {I.upload}
              <span>Upload</span>
            </button>
            <button className="side-btn">+ New</button>
          </div>
          <div className="tree">
            {PROJECT_TREE.map((n) => (
              <FileNode key={n.name} node={n} onPick={setActivePath} activePath={activePath} />
            ))}
          </div>

          <div className="drop-zone">
            <div className="drop-icon">{I.upload}</div>
            <div className="drop-title">Drop .tex, .bib, images here</div>
            <div className="drop-sub">or paste a Overleaf project URL</div>
          </div>
        </div>
      )}

      {tab === 'outline' && (
        <div className="side-body">
          <ul className="outline">
            {OUTLINE.map((o, i) => (
              <li key={i} className={'out-row out-lvl-' + o.lvl}>
                <span className="out-label">{o.label}</span>
                <span className="out-line">L{o.line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="side-foot">
        <div className="proj-meta">
          <div className="proj-name">sgd-paper</div>
          <div className="proj-stat">12 files · 184 KB · last sync 2m</div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Editor pane
// ============================================================================
function EditorToolbar() {
  const items = [
    { i: I.bold, l: 'B', t: 'Bold  \\textbf{}' },
    { i: I.italic, l: 'I', t: 'Italic \\textit{}' },
    { sep: true },
    { i: I.sigma, l: '∑', t: 'Insert equation' },
    { i: I.link, l: 'cite', t: 'Citation \\cite{}' },
    { i: I.list, l: 'list', t: 'List' },
    { i: I.table, l: 'tbl', t: 'Table' },
    { i: I.image, l: 'img', t: 'Insert figure' },
    { sep: true },
    { l: 'H1', t: 'Section' },
    { l: 'H2', t: 'Subsection' },
  ];
  return (
    <div className="ed-toolbar">
      {items.map((it, i) =>
        it.sep ? (
          <span key={i} className="ed-sep" />
        ) : (
          <button key={i} className="ed-tool" title={it.t}>
            {it.i}
            <span>{it.l}</span>
          </button>
        ),
      )}
      <div className="ed-tool-spacer" />
      <span className="ed-info">UTF-8 · LF · LaTeX</span>
    </div>
  );
}

function EditorPane({ source, cursor }) {
  const lines = useMemo(() => source.split('\n'), [source]);
  return (
    <section className="editor-pane" data-screen-label="Editor">
      <div className="pane-head">
        <div className="pane-tabs">
          <div className="pane-tab is-active">
            {I.file('tex')}
            <span>main.tex</span>
            <i className="dirty-dot" />
          </div>
          <div className="pane-tab">
            {I.file('bib')}
            <span>references.bib</span>
          </div>
        </div>
        <div className="pane-head-right">
          <span className="ed-pos">
            Ln {cursor.line}, Col {cursor.col}
          </span>
        </div>
      </div>

      <EditorToolbar />

      <div className="editor-scroll">
        <div className="editor-code">
          <div className="gutter">
            {lines.map((_, i) => (
              <div key={i} className={'ln' + (i + 1 === cursor.line ? ' ln-active' : '')}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="code-col">
            {lines.map((ln, i) => {
              const tokens = tokenizeLatex(ln);
              const isActive = i + 1 === cursor.line;
              return (
                <div key={i} className={'code-line' + (isActive ? ' code-line-active' : '')}>
                  {tokens.length === 0 ? (
                    <span className="tk-text">{'\u200B'}</span>
                  ) : (
                    tokens.map((tk, j) => (
                      <span key={j} className={'tk-' + tk.t}>
                        {tk.v}
                      </span>
                    ))
                  )}
                  {isActive && <span className="caret" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ed-minimap" aria-hidden>
        {lines.map((ln, i) => (
          <div key={i} className="mm-line" style={{ width: Math.min(ln.length, 60) + 'px' }} />
        ))}
        <div className="mm-viewport" />
      </div>
    </section>
  );
}

// ============================================================================
// Preview pane
// ============================================================================
function PreviewPane({ compiling }) {
  const [zoom, setZoom] = useState(100);
  return (
    <section className="preview-pane" data-screen-label="Preview">
      <div className="pane-head preview-head">
        <div className="prev-tabs">
          <div className="pane-tab is-active">main.pdf</div>
          <span className="prev-status">
            {compiling ? (
              <>
                <span className="spinner" /> Compiling
              </>
            ) : (
              <>
                <span className="status-dot status-ok" /> Compiled in 1.42s
              </>
            )}
          </span>
        </div>
        <div className="prev-controls">
          <button className="ctrl-btn" onClick={() => setZoom((z) => Math.max(60, z - 10))}>
            −
          </button>
          <span className="zoom-val">{zoom}%</span>
          <button className="ctrl-btn" onClick={() => setZoom((z) => Math.min(180, z + 10))}>
            +
          </button>
          <span className="ctrl-sep" />
          <button className="ctrl-btn ctrl-page">‹</button>
          <span className="page-val">1 / 4</span>
          <button className="ctrl-btn ctrl-page">›</button>
          <span className="ctrl-sep" />
          <button className="ctrl-btn">{I.download}</button>
        </div>
      </div>

      <div className="preview-scroll">
        <div className="preview-stage" style={{ transform: `scale(${zoom / 100})` }}>
          <PaperPreview />
          {compiling && (
            <div className="prev-overlay">
              <span className="spinner spinner-lg" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Status bar  (log)
// ============================================================================
function StatusBar({ compiling }) {
  const items = compiling
    ? [{ t: 'log', m: 'pdflatex main.tex — pass 1/2' }]
    : [
        { t: 'ok', m: 'Output written on main.pdf (4 pages, 184327 bytes)' },
        { t: 'warn', m: 'Overfull \\hbox (2.7pt too wide) in paragraph at line 51' },
        { t: 'log', m: 'LaTeX Font Info: External font cmex10 loaded' },
      ];
  return (
    <footer className="statusbar">
      <div className="status-left">
        <span className="status-pill status-pill-ok">
          {compiling ? <span className="spinner" /> : I.check}
          {compiling ? ' Compiling' : ' Build OK'}
        </span>
        <span className="status-pill status-pill-warn">{I.warn} 1 warning</span>
        <span className="status-pill">0 errors</span>
        <span className="status-pill">pdflatex · TeX Live 2024</span>
      </div>
      <div className="status-log">
        {items.map((it, i) => (
          <div key={i} className={'log-line log-' + it.t}>
            <span className="log-tag">{it.t.toUpperCase()}</span>
            <span className="log-msg">{it.m}</span>
          </div>
        ))}
      </div>
      <div className="status-right">
        <span className="status-pill">Auto-save · 2s ago</span>
      </div>
    </footer>
  );
}

// ============================================================================
// App
// ============================================================================
const DEFAULTS = /*EDITMODE-BEGIN*/ {
  theme: 'dark',
  accent: '#d97757',
  density: 'comfortable',
  showLineNumbers: true,
  editorFont: 'JetBrains Mono',
  paperTone: 'cream',
}; /*EDITMODE-END*/

function App() {
  const [tweaks, setTweak] = window.useTweaks(DEFAULTS);
  const [compiling, setCompiling] = useState(false);
  const [activePath, setActivePath] = useState('/sgd-paper/main.tex');
  const cursor = { line: 41, col: 28 };

  const onCompile = () => {
    setCompiling(true);
    setTimeout(() => setCompiling(false), 1400);
  };

  // Apply theme + accent to root
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = tweaks.theme;
    r.dataset.density = tweaks.density;
    r.dataset.paper = tweaks.paperTone;
    r.style.setProperty('--accent', tweaks.accent);
    r.style.setProperty('--editor-font', `"${tweaks.editorFont}", ui-monospace, monospace`);
    r.style.setProperty('--show-lns', tweaks.showLineNumbers ? 'block' : 'none');
  }, [tweaks]);

  return (
    <div className="app">
      <TopBar
        docName="main.tex"
        dirty
        onCompile={onCompile}
        compiling={compiling}
        onToggleTheme={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}
        theme={tweaks.theme}
      />
      <div className="workspace">
        <Sidebar activePath={activePath} setActivePath={setActivePath} />
        <EditorPane source={LATEX_SOURCE} cursor={cursor} />
        <div className="splitter" />
        <PreviewPane compiling={compiling} />
      </div>
      <StatusBar compiling={compiling} />

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Appearance">
          <window.TweakRadio
            label="Theme"
            value={tweaks.theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            onChange={(v) => setTweak('theme', v)}
          />
          <window.TweakColor
            label="Accent"
            value={tweaks.accent}
            options={['#d97757', '#3b82f6', '#10b981', '#a855f7']}
            onChange={(v) => setTweak('accent', v)}
          />
          <window.TweakRadio
            label="Paper tone"
            value={tweaks.paperTone}
            options={[
              { value: 'cream', label: 'Cream' },
              { value: 'white', label: 'White' },
            ]}
            onChange={(v) => setTweak('paperTone', v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Editor">
          <window.TweakSelect
            label="Font"
            value={tweaks.editorFont}
            options={[
              { value: 'JetBrains Mono', label: 'JetBrains Mono' },
              { value: 'IBM Plex Mono', label: 'IBM Plex Mono' },
              { value: 'Fira Code', label: 'Fira Code' },
              { value: 'Iosevka', label: 'Iosevka' },
            ]}
            onChange={(v) => setTweak('editorFont', v)}
          />
          <window.TweakToggle
            label="Line numbers"
            value={tweaks.showLineNumbers}
            onChange={(v) => setTweak('showLineNumbers', v)}
          />
          <window.TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
