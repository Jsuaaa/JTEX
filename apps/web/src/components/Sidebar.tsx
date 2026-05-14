import { useMemo, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { ChevronRight, File, FileText, Folder, FolderOpen, Plus, Upload } from 'lucide-react';
import { useProject, type FileEntry } from '../store/project';
import { unzipProject } from '../lib/zip';
import { isTextPath, validateRelativePath } from '@jtex/shared';
import { parseOutline } from '../lib/outline';

type SidebarProps = { onCompile: () => void };

export function Sidebar(_props: SidebarProps) {
  const [tab, setTab] = useState<'files' | 'outline'>('files');
  const project = useProject();
  const fileCount = project.files.size;
  const totalBytes = useMemo(() => {
    let n = 0;
    for (const f of project.files.values()) {
      n += f.kind === 'text' ? new Blob([f.content]).size : f.bytes.byteLength;
    }
    return n;
  }, [project.files]);

  return (
    <aside className="sidebar" aria-label="Project explorer">
      <div className="side-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'files'}
          className={'side-tab' + (tab === 'files' ? ' is-active' : '')}
          onClick={() => setTab('files')}
        >
          Project
        </button>
        <button
          role="tab"
          aria-selected={tab === 'outline'}
          className={'side-tab' + (tab === 'outline' ? ' is-active' : '')}
          onClick={() => setTab('outline')}
        >
          Outline
        </button>
      </div>

      {tab === 'files' ? <FilesTab /> : <OutlineTab />}

      <div className="side-foot">
        <div className="proj-name">{project.name || 'untitled'}</div>
        <div className="proj-stat">
          {fileCount} files · {formatBytes(totalBytes)} · En memoria · refresh borra todo
        </div>
      </div>
    </aside>
  );
}

function FilesTab() {
  const project = useProject();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { files: entries } = await unzipProject(bytes);
        useProject
          .getState()
          .loadProject({ name: file.name.replace(/\.zip$/i, ''), files: entries });
        return;
      }
      const v = validateRelativePath(file.name);
      if (!v.ok) continue;
      if (isTextPath(v.path)) {
        const content = await file.text();
        const entry: FileEntry = { kind: 'text', path: v.path, content, updatedAt: Date.now() };
        upsertFile(entry);
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        useProject.getState().addBinaryFile(v.path, bytes);
      }
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
  };

  const tree = useMemo(() => buildTree(Array.from(project.files.keys())), [project.files]);

  return (
    <div
      className="side-body"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="side-actions">
        <button className="side-btn" onClick={() => fileInput.current?.click()}>
          <Upload size={14} />
          <span>Upload</span>
        </button>
        <button className="side-btn" onClick={() => useProject.getState().reset()}>
          <Plus size={14} />
          <span>New</span>
        </button>
        <input
          type="file"
          multiple
          accept=".tex,.bib,.cls,.sty,.bst,.tikz,.pdf,.png,.jpg,.jpeg,.eps,.svg,.zip"
          ref={fileInput}
          style={{ display: 'none' }}
          onChange={onPick}
        />
      </div>

      <div className="tree" role="tree">
        {tree.map((node) => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>

      <div
        className={'drop-zone' + (dragOver ? ' is-dragover' : '')}
        onClick={() => fileInput.current?.click()}
      >
        <div className="drop-icon">
          <Upload size={20} />
        </div>
        <div className="drop-title">Drop .tex, .bib, images here</div>
        <div className="drop-sub">o un .zip de un proyecto LaTeX</div>
      </div>
    </div>
  );
}

function OutlineTab() {
  const active = useProject((s) => s.activeFile);
  const file = useProject((s) => (active ? s.files.get(active) : null));
  const outline = useMemo(() => {
    if (!file || file.kind !== 'text') return [];
    return parseOutline(file.content);
  }, [file]);

  return (
    <div className="side-body">
      {outline.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: 8 }}>
          No hay secciones en el archivo activo.
        </div>
      ) : (
        <ul className="outline">
          {outline.map((o, i) => (
            <li key={i} className={`out-row out-lvl-${o.level}`}>
              <span className="out-label">{o.label}</span>
              <span className="out-line">L{o.line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TreeFolder = { kind: 'folder'; name: string; path: string; children: TreeNodeT[] };
type TreeFile = { kind: 'file'; name: string; path: string };
type TreeNodeT = TreeFolder | TreeFile;

function buildTree(paths: string[]): TreeNodeT[] {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const p of paths.sort()) {
    const segs = p.split('/');
    let cursor: TreeFolder = root;
    for (let i = 0; i < segs.length; i++) {
      const name = segs[i]!;
      const isLast = i === segs.length - 1;
      if (isLast) {
        cursor.children.push({ kind: 'file', name, path: p });
      } else {
        const subPath = segs.slice(0, i + 1).join('/');
        let dir = cursor.children.find(
          (c): c is TreeFolder => c.kind === 'folder' && c.name === name,
        );
        if (!dir) {
          dir = { kind: 'folder', name, path: subPath, children: [] };
          cursor.children.push(dir);
        }
        cursor = dir;
      }
    }
  }
  const sortNode = (n: TreeNodeT): TreeNodeT => {
    if (n.kind === 'file') return n;
    n.children = n.children.map(sortNode).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return n;
  };
  sortNode(root);
  return root.children;
}

function TreeNode({ node, depth }: { node: TreeNodeT; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const activeFile = useProject((s) => s.activeFile);
  const openFile = useProject((s) => s.openFile);

  if (node.kind === 'folder') {
    return (
      <div>
        <div
          className="tree-row"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setOpen(!open)}
        >
          <span
            className="tree-chev"
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
          >
            <ChevronRight size={10} />
          </span>
          <span className="tree-icon">
            {open ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span className="tree-label">{node.name}</span>
        </div>
        {open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
      </div>
    );
  }
  const isActive = activeFile === node.path;
  return (
    <div
      className={'tree-row' + (isActive ? ' is-active' : '')}
      style={{ paddingLeft: 8 + depth * 12 + 16 }}
      onClick={() => openFile(node.path)}
    >
      <span className="tree-icon">
        {node.name.toLowerCase().endsWith('.tex') ? <FileText size={14} /> : <File size={14} />}
      </span>
      <span className="tree-label">{node.name}</span>
    </div>
  );
}

function upsertFile(entry: FileEntry) {
  const s = useProject.getState();
  const files = new Map(s.files);
  files.set(entry.path, entry);
  useProject.setState({ files });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
