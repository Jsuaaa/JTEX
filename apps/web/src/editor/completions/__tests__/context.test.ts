import { describe, expect, it } from 'vitest';
import type { CompletionContext } from '@codemirror/autocomplete';
import { detectContext } from '../context';

function makeCtx(text: string, explicit = false): CompletionContext {
  const pos = text.length;
  return {
    pos,
    explicit,
    matchBefore(re: RegExp) {
      const anchored = re.source.endsWith('$') ? re : new RegExp(re.source + '$', re.flags);
      const m = anchored.exec(text);
      if (!m) return null;
      const to = pos;
      const from = to - m[0].length;
      return { from, to, text: m[0] };
    },
  } as unknown as CompletionContext;
}

describe('detectContext', () => {
  it('returns null on plain text', () => {
    expect(detectContext(makeCtx('hello world'))).toBeNull();
  });

  it('detects a plain command', () => {
    const r = detectContext(makeCtx('\\sec'));
    expect(r).toEqual({ kind: 'command', token: 'sec', from: 1 });
  });

  it('detects command with just backslash', () => {
    const r = detectContext(makeCtx('text \\'));
    expect(r?.kind).toBe('command');
    expect(r?.token).toBe('');
  });

  it('detects env name inside \\begin{', () => {
    const r = detectContext(makeCtx('\\begin{ite'));
    expect(r).toEqual({ kind: 'envName', token: 'ite', from: 7 });
  });

  it('detects env name inside \\end{', () => {
    const r = detectContext(makeCtx('\\end{eq'));
    expect(r?.kind).toBe('envName');
    expect(r?.token).toBe('eq');
  });

  it('detects cite context', () => {
    const r = detectContext(makeCtx('\\cite{ein'));
    expect(r).toEqual({ kind: 'cite', token: 'ein', from: 6 });
  });

  it('detects citep with prenote', () => {
    const r = detectContext(makeCtx('\\citep[see][p. 5]{ein'));
    expect(r?.kind).toBe('cite');
    expect(r?.token).toBe('ein');
  });

  it('detects cite continuation after comma', () => {
    const r = detectContext(makeCtx('\\cite{a, b, ein'));
    expect(r?.kind).toBe('cite');
    expect(r?.token).toBe('ein');
  });

  it('detects ref context', () => {
    const r = detectContext(makeCtx('\\ref{sec'));
    expect(r).toEqual({ kind: 'ref', token: 'sec', from: 5 });
  });

  it('detects eqref', () => {
    const r = detectContext(makeCtx('\\eqref{eq:'));
    expect(r?.kind).toBe('ref');
    expect(r?.token).toBe('eq:');
  });

  it('detects autoref', () => {
    const r = detectContext(makeCtx('\\autoref{fig'));
    expect(r?.kind).toBe('ref');
  });

  it('does not confuse \\citeable with cite', () => {
    const r = detectContext(makeCtx('\\citeable'));
    expect(r?.kind).toBe('command');
  });

  it('returns command for content after closing brace', () => {
    const r = detectContext(makeCtx('\\cite{foo} \\bar'));
    expect(r?.kind).toBe('command');
    expect(r?.token).toBe('bar');
  });
});
