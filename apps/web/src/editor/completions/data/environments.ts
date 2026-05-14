import type { EnvironmentDef } from '../types';

export const ENVIRONMENTS: EnvironmentDef[] = [
  { name: 'document', template: 'document}\n${1}\n\\end{document}', detail: 'core' },
  { name: 'abstract', template: 'abstract}\n\t${1}\n\\end{abstract}', detail: 'core' },

  { name: 'itemize', template: 'itemize}\n\t\\item ${1}\n\\end{itemize}', detail: 'list' },
  { name: 'enumerate', template: 'enumerate}\n\t\\item ${1}\n\\end{enumerate}', detail: 'list' },
  { name: 'description', template: 'description}\n\t\\item[${1:term}] ${2}\n\\end{description}', detail: 'list' },

  { name: 'equation', template: 'equation}\n\t${1}\n\\end{equation}', detail: 'math' },
  { name: 'equation*', template: 'equation*}\n\t${1}\n\\end{equation*}', detail: 'amsmath' },
  { name: 'align', template: 'align}\n\t${1}\n\\end{align}', detail: 'amsmath' },
  { name: 'align*', template: 'align*}\n\t${1}\n\\end{align*}', detail: 'amsmath' },
  { name: 'gather', template: 'gather}\n\t${1}\n\\end{gather}', detail: 'amsmath' },
  { name: 'multline', template: 'multline}\n\t${1}\n\\end{multline}', detail: 'amsmath' },
  { name: 'split', template: 'split}\n\t${1}\n\\end{split}', detail: 'amsmath' },
  { name: 'cases', template: 'cases}\n\t${1} & \\text{if } ${2} \\\\\n\t${3} & \\text{otherwise}\n\\end{cases}', detail: 'amsmath' },

  { name: 'matrix', template: 'matrix}\n\t${1:a} & ${2:b} \\\\\n\t${3:c} & ${4:d}\n\\end{matrix}', detail: 'amsmath' },
  { name: 'pmatrix', template: 'pmatrix}\n\t${1:a} & ${2:b} \\\\\n\t${3:c} & ${4:d}\n\\end{pmatrix}', detail: 'amsmath' },
  { name: 'bmatrix', template: 'bmatrix}\n\t${1:a} & ${2:b} \\\\\n\t${3:c} & ${4:d}\n\\end{bmatrix}', detail: 'amsmath' },
  { name: 'vmatrix', template: 'vmatrix}\n\t${1:a} & ${2:b} \\\\\n\t${3:c} & ${4:d}\n\\end{vmatrix}', detail: 'amsmath' },

  { name: 'figure', template: 'figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.7\\linewidth}]{${3:file}}\n\t\\caption{${4:caption}}\n\t\\label{fig:${5:key}}\n\\end{figure}', detail: 'core' },
  { name: 'table', template: 'table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${2:cc}}\n\t\t${3}\n\t\\end{tabular}\n\t\\caption{${4:caption}}\n\t\\label{tab:${5:key}}\n\\end{table}', detail: 'core' },
  { name: 'tabular', template: 'tabular}{${1:cc}}\n\t${2}\n\\end{tabular}', detail: 'core' },
  { name: 'array', template: 'array}{${1:cc}}\n\t${2}\n\\end{array}', detail: 'math' },

  { name: 'center', template: 'center}\n\t${1}\n\\end{center}', detail: 'core' },
  { name: 'flushleft', template: 'flushleft}\n\t${1}\n\\end{flushleft}', detail: 'core' },
  { name: 'flushright', template: 'flushright}\n\t${1}\n\\end{flushright}', detail: 'core' },
  { name: 'quote', template: 'quote}\n\t${1}\n\\end{quote}', detail: 'core' },
  { name: 'quotation', template: 'quotation}\n\t${1}\n\\end{quotation}', detail: 'core' },
  { name: 'verse', template: 'verse}\n\t${1}\n\\end{verse}', detail: 'core' },
  { name: 'verbatim', template: 'verbatim}\n${1}\n\\end{verbatim}', detail: 'core' },
  { name: 'lstlisting', template: 'lstlisting}[language=${1:python}]\n${2}\n\\end{lstlisting}', detail: 'listings' },
  { name: 'minted', template: 'minted}{${1:python}}\n${2}\n\\end{minted}', detail: 'minted' },

  { name: 'theorem', template: 'theorem}\n\t${1}\n\\end{theorem}', detail: 'amsthm' },
  { name: 'lemma', template: 'lemma}\n\t${1}\n\\end{lemma}', detail: 'amsthm' },
  { name: 'proof', template: 'proof}\n\t${1}\n\\end{proof}', detail: 'amsthm' },
  { name: 'definition', template: 'definition}\n\t${1}\n\\end{definition}', detail: 'amsthm' },
  { name: 'corollary', template: 'corollary}\n\t${1}\n\\end{corollary}', detail: 'amsthm' },

  { name: 'frame', template: 'frame}{${1:title}}\n\t${2}\n\\end{frame}', detail: 'beamer' },
  { name: 'tikzpicture', template: 'tikzpicture}\n\t${1}\n\\end{tikzpicture}', detail: 'tikz' },
];
