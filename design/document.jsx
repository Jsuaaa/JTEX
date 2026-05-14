// Sample LaTeX document — source code (for editor) and structured content (for preview).
// Keeping them parallel so syntax highlighting and rendered output feel "linked".

const PAPER_TITLE = 'On the Convergence of Stochastic Gradient Descent in Non-Convex Optimization';
const PAPER_AUTHORS = 'J. Tellez,  M. Iwasaki,  R. Adeyemi';
const PAPER_AFFILIATION = 'Department of Computer Science · Institute for Numerical Analysis';

// Raw LaTeX source — what appears in the editor pane.
const LATEX_SOURCE = String.raw`% !TEX program = pdflatex
\documentclass[11pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage{amsmath, amssymb, amsthm}
\usepackage{graphicx}
\usepackage[margin=1in]{geometry}
\usepackage{hyperref}
\usepackage{cite}

\newtheorem{theorem}{Theorem}
\newtheorem{lemma}[theorem]{Lemma}

\title{On the Convergence of Stochastic Gradient Descent
       in Non-Convex Optimization}
\author{J.~Tellez \and M.~Iwasaki \and R.~Adeyemi}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
We revisit the convergence behavior of stochastic gradient
descent (SGD) under relaxed smoothness assumptions. We prove
an $O(1/\sqrt{T})$ rate to a stationary point for a broad
class of non-convex objectives and validate the bound on a
suite of deep network training tasks.
\end{abstract}

\section{Introduction}
Let $f : \mathbb{R}^d \to \mathbb{R}$ be a possibly
non-convex objective with stochastic gradient oracle
$g(x,\xi)$ such that $\mathbb{E}[g(x,\xi)] = \nabla f(x)$.
The classical SGD update is
\begin{equation}
  x_{t+1} = x_t - \eta_t \, g(x_t, \xi_t),
  \label{eq:sgd}
\end{equation}
where $\eta_t > 0$ is the step size at iteration $t$.

\section{Main Result}
\begin{theorem}[Convergence rate]
\label{thm:main}
Assume $f$ is $L$--smooth and that
$\mathbb{E}\|g(x,\xi) - \nabla f(x)\|^2 \le \sigma^2$.
Choosing $\eta_t = \eta / \sqrt{T}$ with $\eta \le 1/L$,
\[
  \frac{1}{T}\sum_{t=1}^{T}
    \mathbb{E}\|\nabla f(x_t)\|^2
    \;\le\; \frac{2(f(x_0)-f^\star)}{\eta\sqrt{T}}
            + \frac{L\eta\sigma^2}{\sqrt{T}}.
\]
\end{theorem}

\subsection{Proof sketch}
By $L$--smoothness and the update rule \eqref{eq:sgd},
\begin{align}
  f(x_{t+1}) &\le f(x_t)
    - \eta_t \langle \nabla f(x_t), g_t \rangle
    + \tfrac{L\eta_t^2}{2}\|g_t\|^2.
\end{align}
Taking expectations and telescoping over $t = 1,\dots,T$
yields the stated bound.\qed

\section{Experiments}
We compare against momentum SGD and Adam on CIFAR-10 with a
ResNet-18 backbone. Figure~\ref{fig:loss} reports the
training loss across 200 epochs.

\begin{figure}[h]
  \centering
  \includegraphics[width=0.7\linewidth]{figures/loss-curve.pdf}
  \caption{Training loss on CIFAR-10. SGD with the proposed
           step size matches Adam after epoch 40.}
  \label{fig:loss}
\end{figure}

\bibliographystyle{plain}
\bibliography{references}

\end{document}`;

// -- Editor token highlighter -----------------------------------------------

// Tokenize one line of LaTeX into spans. Order matters; longest matches first.
function tokenizeLatex(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);

    // Comment runs to end of line
    if (rest[0] === '%') {
      tokens.push({ t: 'comment', v: rest });
      break;
    }
    // Commands  \foo  or  \\
    const cmd = rest.match(/^\\([a-zA-Z@]+\*?|.)/);
    if (cmd) {
      tokens.push({ t: 'cmd', v: cmd[0] });
      i += cmd[0].length;
      continue;
    }
    // Inline math delimiter  $ ... $
    if (rest[0] === '$') {
      const close = rest.indexOf('$', 1);
      if (close > 0) {
        tokens.push({ t: 'math', v: rest.slice(0, close + 1) });
        i += close + 1;
        continue;
      }
    }
    // Braces / brackets
    if ('{}[]'.includes(rest[0])) {
      tokens.push({ t: 'punct', v: rest[0] });
      i += 1;
      continue;
    }
    // Numbers
    const num = rest.match(/^\d+(\.\d+)?/);
    if (num) {
      tokens.push({ t: 'num', v: num[0] });
      i += num[0].length;
      continue;
    }
    // Plain text run
    const text = rest.match(/^[^\\${}\[\]\d%]+/);
    if (text) {
      tokens.push({ t: 'text', v: text[0] });
      i += text[0].length;
      continue;
    }
    tokens.push({ t: 'text', v: rest[0] });
    i += 1;
  }
  return tokens;
}

// -- Rendered preview --------------------------------------------------------

// K renders KaTeX into an inline span — display=true for block equations.
function K({ tex, display = false }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.katex && ref.current) {
      try {
        window.katex.render(tex, ref.current, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
        });
      } catch (e) {
        ref.current.textContent = tex;
      }
    }
  }, [tex, display]);
  return display ? (
    <div className="math-block" ref={ref} />
  ) : (
    <span className="math-inline" ref={ref} />
  );
}

function PaperPreview() {
  return (
    <article className="paper">
      <header className="paper-head">
        <h1 className="paper-title">{PAPER_TITLE}</h1>
        <p className="paper-authors">{PAPER_AUTHORS}</p>
        <p className="paper-affil">{PAPER_AFFILIATION}</p>
        <p className="paper-date">November 14, 2025</p>
      </header>

      <section className="paper-abstract">
        <h3>Abstract</h3>
        <p>
          We revisit the convergence behavior of stochastic gradient descent (SGD) under relaxed
          smoothness assumptions. We prove an <K tex="O(1/\sqrt{T})" /> rate to a stationary point
          for a broad class of non-convex objectives and validate the bound on a suite of deep
          network training tasks.
        </p>
      </section>

      <section className="paper-section">
        <h2>
          <span className="sec-num">1</span> Introduction
        </h2>
        <p>
          Let <K tex="f : \mathbb{R}^d \to \mathbb{R}" /> be a possibly non-convex objective with
          stochastic gradient oracle <K tex="g(x,\xi)" /> such that{' '}
          <K tex="\mathbb{E}[g(x,\xi)] = \nabla f(x)" />. The classical SGD update is
        </p>
        <div className="eq-row">
          <K display tex={String.raw`x_{t+1} = x_t - \eta_t\, g(x_t, \xi_t),`} />
          <span className="eq-num">(1)</span>
        </div>
        <p>
          where <K tex="\eta_t > 0" /> is the step size at iteration <K tex="t" />.
        </p>
      </section>

      <section className="paper-section">
        <h2>
          <span className="sec-num">2</span> Main Result
        </h2>
        <div className="theorem">
          <p>
            <strong>Theorem 1 (Convergence rate).</strong>{' '}
            <em>
              Assume <K tex="f" /> is <K tex="L" />
              –smooth and that{' '}
              <K tex={String.raw`\mathbb{E}\|g(x,\xi) - \nabla f(x)\|^2 \le \sigma^2`} />. Choosing{' '}
              <K tex={String.raw`\eta_t = \eta / \sqrt{T}`} /> with{' '}
              <K tex={String.raw`\eta \le 1/L`} />,
            </em>
          </p>
          <K
            display
            tex={String.raw`\frac{1}{T}\sum_{t=1}^{T} \mathbb{E}\|\nabla f(x_t)\|^2 \;\le\; \frac{2(f(x_0)-f^\star)}{\eta\sqrt{T}} + \frac{L\eta\sigma^2}{\sqrt{T}}.`}
          />
        </div>

        <h3>
          <span className="sec-num">2.1</span> Proof sketch
        </h3>
        <p>
          By <K tex="L" />
          –smoothness and the update rule (1),
        </p>
        <K
          display
          tex={String.raw`f(x_{t+1}) \le f(x_t) - \eta_t \langle \nabla f(x_t), g_t \rangle + \tfrac{L\eta_t^2}{2}\|g_t\|^2.`}
        />
        <p>
          Taking expectations and telescoping over <K tex="t = 1,\dots,T" /> yields the stated
          bound.
          <span className="qed">□</span>
        </p>
      </section>

      <section className="paper-section">
        <h2>
          <span className="sec-num">3</span> Experiments
        </h2>
        <p>
          We compare against momentum SGD and Adam on CIFAR-10 with a ResNet-18 backbone. Figure 1
          reports the training loss across 200 epochs.
        </p>
        <figure className="paper-fig">
          <div className="fig-chart">
            <FigureChart />
          </div>
          <figcaption>
            <strong>Figure 1.</strong> Training loss on CIFAR-10. SGD with the proposed step size
            matches Adam after epoch 40.
          </figcaption>
        </figure>
      </section>

      <section className="paper-section paper-refs">
        <h2>References</h2>
        <ol>
          <li>
            Bottou, L. &amp; Bousquet, O. The tradeoffs of large scale learning. <em>NeurIPS</em>,
            2008.
          </li>
          <li>
            Ghadimi, S. &amp; Lan, G. Stochastic first- and zeroth-order methods for nonconvex
            stochastic programming. <em>SIAM J. Optim.</em>, 2013.
          </li>
          <li>
            Kingma, D. &amp; Ba, J. Adam: A method for stochastic optimization. <em>ICLR</em>, 2015.
          </li>
        </ol>
      </section>

      <footer className="paper-foot">
        <span>1</span>
      </footer>
    </article>
  );
}

// Small inline SVG line chart — stands in for the figure.
function FigureChart() {
  // three curves: SGD, Momentum, Adam (decreasing loss)
  const pts = (offset, decay) => {
    const out = [];
    for (let x = 0; x <= 100; x += 2) {
      const t = x / 100;
      const y = offset * Math.exp(-decay * t) + 0.08 + 0.02 * Math.sin(t * 14);
      out.push([20 + x * 3.4, 180 - y * 130]);
    }
    return out.map((p) => p.join(',')).join(' ');
  };
  return (
    <svg viewBox="0 0 380 220" width="100%" height="100%">
      {/* axes */}
      <line x1="20" y1="180" x2="360" y2="180" stroke="currentColor" strokeWidth="0.8" />
      <line x1="20" y1="20" x2="20" y2="180" stroke="currentColor" strokeWidth="0.8" />
      {/* grid */}
      {[40, 80, 120, 160].map((y) => (
        <line
          key={y}
          x1="20"
          y1={y}
          x2="360"
          y2={y}
          stroke="currentColor"
          strokeWidth="0.3"
          opacity="0.25"
        />
      ))}
      {/* curves */}
      <polyline points={pts(1.6, 3.2)} fill="none" stroke="#9aa0a6" strokeWidth="1.4" />
      <polyline
        points={pts(1.5, 4.6)}
        fill="none"
        stroke="#5a6470"
        strokeWidth="1.4"
        strokeDasharray="3 3"
      />
      <polyline points={pts(1.45, 6.2)} fill="none" stroke="var(--accent)" strokeWidth="1.8" />
      {/* labels */}
      <text x="330" y="55" fontSize="9" fill="var(--accent)">
        SGD (ours)
      </text>
      <text x="320" y="86" fontSize="9" fill="#5a6470">
        Momentum
      </text>
      <text x="330" y="115" fontSize="9" fill="#9aa0a6">
        Adam
      </text>
      <text x="190" y="205" fontSize="9" fill="currentColor" textAnchor="middle">
        epoch
      </text>
      <text
        x="8"
        y="100"
        fontSize="9"
        fill="currentColor"
        transform="rotate(-90 8 100)"
        textAnchor="middle"
      >
        loss
      </text>
    </svg>
  );
}

// -- Project file tree -------------------------------------------------------

const PROJECT_TREE = [
  {
    kind: 'folder',
    name: 'sgd-paper',
    open: true,
    children: [
      { kind: 'file', name: 'main.tex', ext: 'tex', active: true, size: '4.2 KB', dirty: true },
      { kind: 'file', name: 'references.bib', ext: 'bib', size: '11.8 KB' },
      {
        kind: 'folder',
        name: 'figures',
        open: true,
        children: [
          { kind: 'file', name: 'loss-curve.pdf', ext: 'pdf', size: '38 KB' },
          { kind: 'file', name: 'arch-diagram.png', ext: 'png', size: '120 KB' },
        ],
      },
      {
        kind: 'folder',
        name: 'sections',
        open: false,
        children: [
          { kind: 'file', name: 'intro.tex', ext: 'tex' },
          { kind: 'file', name: 'method.tex', ext: 'tex' },
        ],
      },
      { kind: 'file', name: 'preamble.sty', ext: 'sty', size: '1.1 KB' },
      { kind: 'file', name: '.gitignore', ext: 'gitignore' },
    ],
  },
];

const OUTLINE = [
  { lvl: 1, label: 'Abstract', line: 25 },
  { lvl: 1, label: '1  Introduction', line: 33 },
  { lvl: 1, label: '2  Main Result', line: 44 },
  { lvl: 2, label: '2.1  Proof sketch', line: 60 },
  { lvl: 1, label: '3  Experiments', line: 68 },
];

Object.assign(window, {
  PAPER_TITLE,
  LATEX_SOURCE,
  tokenizeLatex,
  PaperPreview,
  PROJECT_TREE,
  OUTLINE,
});
