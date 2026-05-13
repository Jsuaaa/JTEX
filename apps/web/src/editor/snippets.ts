import type { EditorView } from '@codemirror/view';

export function insertAtCursor(view: EditorView, before: string, after = ''): void {
  const { state, dispatch } = view;
  const sel = state.selection.main;
  const inserted = before + state.sliceDoc(sel.from, sel.to) + after;
  dispatch({
    changes: { from: sel.from, to: sel.to, insert: inserted },
    selection: { anchor: sel.from + before.length, head: sel.from + before.length + (sel.to - sel.from) },
    scrollIntoView: true,
  });
  view.focus();
}

export function insertBlock(view: EditorView, block: string): void {
  const { state, dispatch } = view;
  const sel = state.selection.main;
  dispatch({
    changes: { from: sel.from, to: sel.to, insert: block },
    selection: { anchor: sel.from + block.length },
    scrollIntoView: true,
  });
  view.focus();
}

export const SNIPPETS = {
  bold: (v: EditorView) => insertAtCursor(v, '\\textbf{', '}'),
  italic: (v: EditorView) => insertAtCursor(v, '\\textit{', '}'),
  math: (v: EditorView) => insertAtCursor(v, '$', '$'),
  equation: (v: EditorView) => insertBlock(v, '\\begin{equation}\n  \n\\end{equation}\n'),
  cite: (v: EditorView) => insertAtCursor(v, '\\cite{', '}'),
  list: (v: EditorView) => insertBlock(v, '\\begin{itemize}\n  \\item \n\\end{itemize}\n'),
  table: (v: EditorView) =>
    insertBlock(v, '\\begin{tabular}{cc}\n  a & b \\\\\n  c & d \\\\\n\\end{tabular}\n'),
  figure: (v: EditorView) =>
    insertBlock(v, '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.6\\linewidth]{}\n  \\caption{}\n\\end{figure}\n'),
  section: (v: EditorView) => insertAtCursor(v, '\\section{', '}'),
  subsection: (v: EditorView) => insertAtCursor(v, '\\subsection{', '}'),
};
