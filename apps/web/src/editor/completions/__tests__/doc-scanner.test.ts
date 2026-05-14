import { describe, expect, it } from 'vitest';
import { scanDocument } from '../doc-scanner';

describe('scanDocument', () => {
  it('returns empty for empty content', () => {
    expect(scanDocument('main.tex', '')).toEqual({ labels: [], localCommands: [] });
  });

  it('extracts \\label entries with line numbers', () => {
    const content = `\\section{Intro}
\\label{sec:intro}

\\subsection{More}
\\label{subsec:more}`;
    const result = scanDocument('main.tex', content);
    expect(result.labels).toEqual([
      { name: 'sec:intro', file: 'main.tex', line: 2 },
      { name: 'subsec:more', file: 'main.tex', line: 5 },
    ]);
  });

  it('extracts \\newcommand with braces around name', () => {
    const content = `\\newcommand{\\myvec}[1]{\\mathbf{#1}}
\\newcommand{\\nb}{\\noindent}`;
    const result = scanDocument('main.tex', content);
    expect(result.localCommands).toEqual([
      { name: 'myvec', args: 1, file: 'main.tex', line: 1 },
      { name: 'nb', args: 0, file: 'main.tex', line: 2 },
    ]);
  });

  it('extracts \\renewcommand and \\providecommand', () => {
    const content = `\\renewcommand{\\foo}{bar}
\\providecommand{\\baz}[2]{x}`;
    const result = scanDocument('main.tex', content);
    expect(result.localCommands.map((c) => c.name)).toEqual(['foo', 'baz']);
  });

  it('ignores commands inside comments', () => {
    const content = `% \\newcommand{\\ignored}{x}
\\newcommand{\\real}{y}
% \\label{ignored}
\\label{real}`;
    const result = scanDocument('main.tex', content);
    expect(result.localCommands.map((c) => c.name)).toEqual(['real']);
    expect(result.labels.map((l) => l.name)).toEqual(['real']);
  });

  it('ignores commands inside verbatim blocks', () => {
    const content = `\\begin{verbatim}
\\newcommand{\\ignored}{x}
\\label{ignored}
\\end{verbatim}
\\newcommand{\\real}{y}`;
    const result = scanDocument('main.tex', content);
    expect(result.localCommands.map((c) => c.name)).toEqual(['real']);
    expect(result.labels).toHaveLength(0);
  });

  it('ignores commands inside lstlisting blocks', () => {
    const content = `\\begin{lstlisting}
\\label{ignored}
\\end{lstlisting}
\\label{real}`;
    const result = scanDocument('main.tex', content);
    expect(result.labels.map((l) => l.name)).toEqual(['real']);
  });

  it('handles multiple labels on the same line', () => {
    const content = `\\label{a} text \\label{b}`;
    const result = scanDocument('main.tex', content);
    expect(result.labels.map((l) => l.name)).toEqual(['a', 'b']);
  });
});
