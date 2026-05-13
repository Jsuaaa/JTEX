import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const colors = {
  bg: 'var(--bg)',
  text: 'var(--text)',
  caret: 'var(--accent)',
  selection: 'color-mix(in oklch, var(--accent) 30%, transparent)',
  gutter: 'var(--muted)',
  activeGutter: 'var(--accent)',
  cmd: 'var(--tk-cmd)',
  math: 'var(--tk-math)',
  comment: 'var(--tk-comment)',
  num: 'var(--tk-num)',
  punct: 'var(--tk-punct)',
};

export const jtexTheme = EditorView.theme(
  {
    '&': { color: colors.text, backgroundColor: colors.bg, height: '100%' },
    '.cm-content': { caretColor: colors.caret, fontFamily: 'var(--editor-font)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: colors.caret, borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: colors.selection,
    },
    '.cm-gutters': { backgroundColor: 'var(--bg)', color: colors.gutter, border: 'none', borderRight: '1px solid var(--border-soft)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: colors.activeGutter },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--accent) 6%, transparent)' },
    '.cm-scroller': { fontFamily: 'var(--editor-font)' },
    '.cm-tooltip': { backgroundColor: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--bg-active)' },
  },
  { dark: true },
);

const jtexHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.tagName, t.bracket], color: 'var(--tk-cmd)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--tk-math)' },
  { tag: t.comment, color: 'var(--tk-comment)', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.atom], color: 'var(--tk-num)' },
  { tag: t.punctuation, color: 'var(--tk-punct)' },
  { tag: t.heading, color: 'var(--text-strong)', fontWeight: '600' },
]);

export const jtexHighlightExt = syntaxHighlighting(jtexHighlight);
