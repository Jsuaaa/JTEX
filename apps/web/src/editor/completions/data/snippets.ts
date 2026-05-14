import type { SnippetDef } from '../types';

export const SNIPPETS: SnippetDef[] = [
  {
    label: 'doc',
    detail: 'document boilerplate',
    template:
      'documentclass{${1:article}}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\n\\title{${2:Title}}\n\\author{${3:Author}}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\n${4}\n\n\\end{document}',
  },
  {
    label: 'fig',
    detail: 'figure with caption + label',
    template:
      'begin{figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.7\\linewidth}]{${3:file}}\n\t\\caption{${4:caption}}\n\t\\label{fig:${5:key}}\n\\end{figure}',
  },
  {
    label: 'tbl',
    detail: 'table with caption + label',
    template:
      'begin{table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${2:cc}}\n\t\t\\toprule\n\t\t${3:header}\n\t\t\\midrule\n\t\t${4:body}\n\t\t\\bottomrule\n\t\\end{tabular}\n\t\\caption{${5:caption}}\n\t\\label{tab:${6:key}}\n\\end{table}',
  },
  {
    label: 'itm',
    detail: 'itemize',
    template: 'begin{itemize}\n\t\\item ${1}\n\t\\item ${2}\n\t\\item ${3}\n\\end{itemize}',
  },
  {
    label: 'enum',
    detail: 'enumerate',
    template: 'begin{enumerate}\n\t\\item ${1}\n\t\\item ${2}\n\t\\item ${3}\n\\end{enumerate}',
  },
  {
    label: 'eqn',
    detail: 'equation',
    template: 'begin{equation}\n\t${1}\n\t\\label{eq:${2:key}}\n\\end{equation}',
  },
  {
    label: 'aln',
    detail: 'align (amsmath)',
    template: 'begin{align}\n\t${1} &= ${2} \\\\\n\t&= ${3}\n\\end{align}',
  },
  {
    label: 'mat',
    detail: 'pmatrix 2x2',
    template: 'begin{pmatrix}\n\t${1:a} & ${2:b} \\\\\n\t${3:c} & ${4:d}\n\\end{pmatrix}',
  },
  {
    label: 'thm',
    detail: 'theorem',
    template: 'begin{theorem}[${1:name}]\n\t${2}\n\\end{theorem}',
  },
  {
    label: 'pf',
    detail: 'proof',
    template: 'begin{proof}\n\t${1}\n\\end{proof}',
  },
  {
    label: 'sec',
    detail: 'section',
    template: 'section{${1:title}}\n\\label{sec:${2:key}}\n\n${3}',
  },
  {
    label: 'subsec',
    detail: 'subsection',
    template: 'subsection{${1:title}}\n\\label{subsec:${2:key}}\n\n${3}',
  },
  {
    label: 'frame',
    detail: 'beamer frame',
    template: 'begin{frame}{${1:title}}\n\t${2}\n\\end{frame}',
  },
  {
    label: 'cases',
    detail: 'piecewise function',
    template: 'begin{cases}\n\t${1} & \\text{if } ${2} \\\\\n\t${3} & \\text{otherwise}\n\\end{cases}',
  },
  {
    label: 'pkg',
    detail: 'usepackage',
    template: 'usepackage{${1:package}}',
  },
  {
    label: 'href',
    detail: 'hyperlink',
    template: 'href{${1:url}}{${2:text}}',
  },
  {
    label: 'todo',
    detail: 'todo note',
    template: 'textcolor{red}{TODO: ${1:note}}',
  },
  {
    label: 'fnote',
    detail: 'footnote',
    template: 'footnote{${1:note}}',
  },
  {
    label: 'code',
    detail: 'minted block',
    template: 'begin{minted}{${1:python}}\n${2}\n\\end{minted}',
  },
  {
    label: 'verb',
    detail: 'verbatim block',
    template: 'begin{verbatim}\n${1}\n\\end{verbatim}',
  },
  {
    label: 'tikz',
    detail: 'tikz picture',
    template: 'begin{tikzpicture}\n\t${1}\n\\end{tikzpicture}',
  },
  {
    label: 'def',
    detail: 'definition env',
    template: 'begin{definition}[${1:name}]\n\t${2}\n\\end{definition}',
  },
  {
    label: 'lem',
    detail: 'lemma env',
    template: 'begin{lemma}[${1:name}]\n\t${2}\n\\end{lemma}',
  },
  {
    label: 'abs',
    detail: 'abstract',
    template: 'begin{abstract}\n\t${1}\n\\end{abstract}',
  },
];
