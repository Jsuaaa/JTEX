import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from 'lucide-react';
import { useProject } from '../store/project';

type PdfDocLike = { numPages: number; getPage: (n: number) => Promise<PdfPageLike> };
type PdfPageLike = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(async (mod) => {
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
      return mod;
    });
  }
  return pdfjsPromise;
}

export function PreviewPane({ onCompile }: { onCompile: () => void }) {
  const compile = useProject((s) => s.compile);
  const [zoom, setZoom] = useState(100);
  const [pdfDoc, setPdfDoc] = useState<PdfDocLike | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compile.status !== 'success') {
      setPdfDoc(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const pdfjs = await loadPdfJs();
      const data = await compile.pdfBlob.arrayBuffer();
      if (cancelled) return;
      const task = pdfjs.getDocument({ data });
      const doc = await task.promise;
      if (!cancelled) {
        setPdfDoc(doc as unknown as PdfDocLike);
        setCurrentPage(1);
      }
    })().catch((err) => {
      console.error('PDF load failed', err);
    });
    return () => { cancelled = true; };
  }, [compile]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    let cancelled = false;
    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return;
        const page = await pdfDoc.getPage(i);
        const scale = (zoom / 100) * 1.4;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.dataset.page = String(i);
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        container.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })().catch((err) => console.error('PDF render failed', err));
    return () => { cancelled = true; };
  }, [pdfDoc, zoom]);

  const onScroll = () => {
    if (!containerRef.current) return;
    const pages = containerRef.current.querySelectorAll<HTMLCanvasElement>('canvas.pdf-page');
    const top = containerRef.current.scrollTop;
    let visible = 1;
    pages.forEach((c) => {
      if (c.offsetTop <= top + 40) visible = Number(c.dataset.page ?? '1');
    });
    setCurrentPage(visible);
  };

  const goPage = (n: number) => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector<HTMLCanvasElement>(`canvas[data-page="${n}"]`);
    if (canvas) containerRef.current.scrollTo({ top: canvas.offsetTop - 16, behavior: 'smooth' });
  };

  const totalPages = pdfDoc?.numPages ?? 0;
  const compiling = compile.status === 'compiling';
  const showError = compile.status === 'error' || compile.status === 'timeout' || compile.status === 'invalid' || compile.status === 'network_error';

  return (
    <section className="preview-pane">
      <div className="pane-head preview-head">
        <div className="prev-tabs">
          <div className="pane-tab is-active">main.pdf</div>
          <span className="prev-status">
            {compiling && <><span className="spinner" /> Compiling…</>}
            {compile.status === 'success' && <><span className="status-dot status-ok" /> Compiled in {(compile.durationMs / 1000).toFixed(2)}s</>}
            {showError && <><span className="status-dot status-err" /> {labelFor(compile.status)}</>}
            {compile.status === 'idle' && <><span className="status-dot" /> Sin compilar</>}
          </span>
        </div>
        <div className="prev-controls">
          <button className="ctrl-btn" onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="Zoom out"><Minus size={12} /></button>
          <span className="zoom-val">{zoom}%</span>
          <button className="ctrl-btn" onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="Zoom in"><Plus size={12} /></button>
          <span className="ctrl-sep" />
          <button className="ctrl-btn" onClick={() => goPage(Math.max(1, currentPage - 1))} aria-label="Previous page" disabled={!pdfDoc}><ChevronLeft size={12} /></button>
          <span className="page-val">{pdfDoc ? `${currentPage} / ${totalPages}` : '—'}</span>
          <button className="ctrl-btn" onClick={() => goPage(Math.min(totalPages, currentPage + 1))} aria-label="Next page" disabled={!pdfDoc}><ChevronRight size={12} /></button>
          <span className="ctrl-sep" />
          <button
            className="ctrl-btn"
            disabled={compile.status !== 'success'}
            onClick={() => {
              if (compile.status !== 'success') return;
              const url = URL.createObjectURL(compile.pdfBlob);
              const a = document.createElement('a');
              a.href = url; a.download = 'document.pdf';
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            aria-label="Download PDF"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      <div className="prev-stage-wrap">
        <div
          ref={containerRef}
          className="preview-scroll"
          onScroll={onScroll}
          style={{ display: compile.status === 'success' ? 'flex' : 'none' }}
        />
        {compile.status !== 'success' && (
          <div className="preview-scroll">
            {compile.status === 'idle' && (
              <div className="prev-empty">
                Presioná <kbd>⌘↵</kbd> o el botón <strong>Recompile</strong> para generar el PDF.
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={onCompile}>Recompile ahora</button>
                </div>
              </div>
            )}
            {compiling && <div className="prev-empty"><span className="spinner spinner-lg" /></div>}
            {showError && <ErrorBox />}
          </div>
        )}
      </div>
    </section>
  );
}

function ErrorBox() {
  const compile = useProject((s) => s.compile);
  if (compile.status === 'error') {
    return (
      <div className="prev-error">
        <h3>Error de compilación</h3>
        <pre>{compile.errorSummary || compile.log.slice(-2000)}</pre>
      </div>
    );
  }
  if (compile.status === 'timeout') {
    return (
      <div className="prev-error">
        <h3>Timeout</h3>
        <pre>El compilador superó el límite de tiempo. Revisá si hay un loop infinito o un paquete que no responde.</pre>
      </div>
    );
  }
  if (compile.status === 'invalid' || compile.status === 'network_error') {
    return (
      <div className="prev-error">
        <h3>{compile.status === 'invalid' ? 'Petición inválida' : 'Error de red'}</h3>
        <pre>{compile.reason}</pre>
      </div>
    );
  }
  return null;
}

function labelFor(s: string): string {
  switch (s) {
    case 'error': return 'Error de compilación';
    case 'timeout': return 'Timeout';
    case 'invalid': return 'Petición inválida';
    case 'network_error': return 'Error de red';
    default: return s;
  }
}
