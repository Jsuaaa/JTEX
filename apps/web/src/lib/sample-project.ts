import type { FileEntry } from '../store/project';

const SAMPLE_MAIN = String.raw`% !TEX program = pdflatex
\documentclass[11pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage{amsmath, amssymb}
\usepackage[margin=1in]{geometry}
\usepackage{hyperref}

\title{Welcome to JTEX}
\author{You}
\date{\today}

\begin{document}
\maketitle

\section{Introduction}
This is a sample document. Edit \texttt{main.tex} on the left and press
\textbf{Recompile} (or $\mathtt{\mathrm{Cmd}}+\mathtt{\mathrm{Enter}}$) to render the PDF on the right.

\section{Math example}
The Pythagorean identity is
\begin{equation}
  \sin^2\theta + \cos^2\theta = 1.
\end{equation}

\end{document}
`;

export function buildSampleProject(): { name: string; files: FileEntry[]; entryFile: string } {
  const now = Date.now();
  return {
    name: 'sample',
    files: [{ kind: 'text', path: 'main.tex', content: SAMPLE_MAIN, updatedAt: now }],
    entryFile: 'main.tex',
  };
}
