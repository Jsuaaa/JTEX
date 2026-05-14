import { EditorView } from '@codemirror/view';

const BEGIN_RE = /\\begin\{([A-Za-z*]+)\}\s*$/;

export function autoCloseEnv() {
  return EditorView.domEventHandlers({
    keydown(event, view) {
      if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return false;
      }
      const sel = view.state.selection.main;
      if (!sel.empty) return false;

      const line = view.state.doc.lineAt(sel.from);
      const before = view.state.sliceDoc(line.from, sel.from);
      const m = BEGIN_RE.exec(before);
      if (!m) return false;

      const envName = m[1];
      if (!envName) return false;

      const indent = (before.match(/^\s*/)?.[0] ?? '');
      const innerIndent = indent + '\t';
      const insert = `\n${innerIndent}\n${indent}\\end{${envName}}`;
      const cursor = sel.from + 1 + innerIndent.length;

      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: cursor },
        scrollIntoView: true,
        userEvent: 'input.complete.endenv',
      });
      event.preventDefault();
      return true;
    },
  });
}
