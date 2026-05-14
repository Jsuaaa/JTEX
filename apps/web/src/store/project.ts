import { create } from 'zustand';
import type { Engine } from '@jtex/shared';

export type FileEntry =
  | { kind: 'text'; path: string; content: string; updatedAt: number }
  | { kind: 'binary'; path: string; bytes: Uint8Array; updatedAt: number };

export type CompileState =
  | { status: 'idle' }
  | { status: 'compiling'; startedAt: number }
  | { status: 'success'; pdfBlob: Blob; log: string; durationMs: number; finishedAt: number }
  | { status: 'error'; log: string; errorSummary: string; finishedAt: number }
  | { status: 'timeout'; log: string; finishedAt: number }
  | { status: 'invalid'; reason: string }
  | { status: 'network_error'; reason: string };

export type CursorMove = { file: string; line: number; seq: number };

export type ProjectStore = {
  name: string;
  entryFile: string | null;
  engine: Engine;
  files: Map<string, FileEntry>;
  openTabs: string[];
  activeFile: string | null;
  compile: CompileState;
  lastSavedAt: number | null;
  pendingCursorMove: CursorMove | null;

  loadProject: (input: { name: string; files: FileEntry[]; entryFile?: string | null }) => void;
  reset: () => void;
  setActiveFile: (path: string | null) => void;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  writeFile: (path: string, content: string) => void;
  addBinaryFile: (path: string, bytes: Uint8Array) => void;
  deleteFile: (path: string) => void;
  setEntryFile: (path: string) => void;
  setEngine: (engine: Engine) => void;
  setCompile: (state: CompileState) => void;
  requestCursorMove: (file: string, line: number) => void;
  consumePendingCursorMove: (seq: number) => void;
};

const initial = {
  name: 'untitled',
  entryFile: null as string | null,
  engine: 'tectonic' as Engine,
  files: new Map<string, FileEntry>(),
  openTabs: [] as string[],
  activeFile: null as string | null,
  compile: { status: 'idle' } as CompileState,
  lastSavedAt: null as number | null,
  pendingCursorMove: null as CursorMove | null,
};

let cursorMoveSeq = 0;

export const useProject = create<ProjectStore>((set, get) => ({
  ...initial,

  loadProject: ({ name, files, entryFile }) => {
    const map = new Map<string, FileEntry>();
    for (const f of files) map.set(f.path, f);
    const entry = entryFile ?? detectEntry(files);
    set({
      name,
      files: map,
      entryFile: entry,
      activeFile: entry,
      openTabs: entry ? [entry] : [],
      compile: { status: 'idle' },
      lastSavedAt: Date.now(),
    });
  },

  reset: () => set({ ...initial, files: new Map() }),

  setActiveFile: (path) => set({ activeFile: path }),

  openFile: (path) => {
    const tabs = get().openTabs;
    if (!tabs.includes(path)) set({ openTabs: [...tabs, path] });
    set({ activeFile: path });
  },

  closeTab: (path) => {
    const tabs = get().openTabs.filter((p) => p !== path);
    let active = get().activeFile;
    if (active === path) active = tabs[tabs.length - 1] ?? null;
    set({ openTabs: tabs, activeFile: active });
  },

  writeFile: (path, content) => {
    const files = new Map(get().files);
    const existing = files.get(path);
    if (!existing || existing.kind !== 'text') return;
    files.set(path, { ...existing, content, updatedAt: Date.now() });
    set({ files, lastSavedAt: Date.now() });
  },

  addBinaryFile: (path, bytes) => {
    const files = new Map(get().files);
    files.set(path, { kind: 'binary', path, bytes, updatedAt: Date.now() });
    set({ files });
  },

  deleteFile: (path) => {
    const files = new Map(get().files);
    files.delete(path);
    const tabs = get().openTabs.filter((p) => p !== path);
    let active = get().activeFile;
    if (active === path) active = tabs[tabs.length - 1] ?? null;
    set({ files, openTabs: tabs, activeFile: active });
  },

  setEntryFile: (path) => set({ entryFile: path }),
  setEngine: (engine) => set({ engine }),
  setCompile: (compile) => set({ compile }),

  requestCursorMove: (file, line) => {
    cursorMoveSeq += 1;
    set({ pendingCursorMove: { file, line, seq: cursorMoveSeq } });
  },

  consumePendingCursorMove: (seq) => {
    const current = get().pendingCursorMove;
    if (current && current.seq === seq) set({ pendingCursorMove: null });
  },
}));

function detectEntry(files: FileEntry[]): string | null {
  const texFiles = files.filter(
    (f) => f.kind === 'text' && f.path.toLowerCase().endsWith('.tex'),
  ) as Extract<FileEntry, { kind: 'text' }>[];
  for (const f of texFiles) {
    if (/\\documentclass\b/.test(f.content)) return f.path;
  }
  return texFiles[0]?.path ?? null;
}
