# Modelo de datos — jtex

**No hay base de datos.** El servidor es stateless. Este documento describe:
1. La estructura del estado del proyecto en el cliente (browser).
2. La estructura del filesystem efímero del servidor durante una compilación.
3. La forma del request/response de `POST /api/compile`.

---

## 1. Estado en el cliente (Zustand store)

```ts
type Engine = 'tectonic' | 'pdflatex' | 'xelatex' | 'lualatex';

type FileEntry =
  | { kind: 'text'; path: string; content: string; updatedAt: number }
  | { kind: 'binary'; path: string; bytes: Uint8Array; updatedAt: number };

type CompileResult =
  | { status: 'idle' }
  | { status: 'compiling'; startedAt: number }
  | { status: 'success'; pdfBlob: Blob; log: string; durationMs: number; finishedAt: number }
  | { status: 'error'; log: string; errorSummary: string; finishedAt: number }
  | { status: 'timeout'; log: string; finishedAt: number };

type ProjectState = {
  name: string;                    // ej. "untitled" o el nombre del zip subido
  entryFile: string | null;        // path relativo del .tex principal
  engine: Engine;                  // default 'tectonic'
  files: Map<string, FileEntry>;   // key = path relativo
  activeFile: string | null;       // path actualmente abierto en el editor
  compile: CompileResult;          // estado del último compile
};
```

**Persistencia:** ninguna por default. El store vive en memoria de la pestaña. **Refresh del browser = todo se pierde**, intencionalmente.

**Opcional (Fase 4, detrás de un toggle "Recordar este proyecto en mi navegador" — OFF por default):** snapshot del `ProjectState` a IndexedDB cada N segundos, restaurado al cargar. Cuando el toggle está OFF, nada toca IndexedDB.

### Validación de paths (cliente y servidor, código compartido en `packages/shared/paths.ts`)
- No empieza con `/` ni `\`.
- No contiene `..` como segmento.
- No contiene caracteres de control (`\x00-\x1f`).
- Extensión en la whitelist: `.tex`, `.bib`, `.cls`, `.sty`, `.bst`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.eps`, `.svg`, `.tikz`.
- Longitud total del path ≤ 255 chars.
- Cantidad total de archivos en el proyecto ≤ 200.
- Tamaño total ≤ 50MB.

---

## 2. Estructura efímera en el servidor durante un compile

Por cada request a `POST /api/compile`, el servidor:

```
/tmp/jobs/<jobId>/                  ← uuid v4, creado al recibir el request
├── main.tex                        ← archivos del usuario, escritos desde el multipart
├── refs.bib
├── chapters/
│   └── intro.tex
├── images/
│   └── figure.png
├── main.pdf                        ← generado por tectonic
└── main.log                        ← generado por tectonic
```

- `/tmp` está montado como **tmpfs** en el container (configurado en Coolify o vía entrypoint).
- Tras devolver la respuesta, el handler hace `fs.rm('/tmp/jobs/<jobId>', { recursive: true, force: true })` en el `finally`.
- Si el container se reinicia mid-flight: el tmpfs entero desaparece. No queda residuo.
- Si el `rm` falla (caso raro): el siguiente reinicio del container limpia. Aceptable.

---

## 3. Contrato del endpoint `POST /api/compile`

### Request

`Content-Type: multipart/form-data`

| Field | Tipo | Notas |
|---|---|---|
| `entryFile` | text | path relativo del `.tex` principal, ej. `main.tex` |
| `engine` | text | `tectonic` \| `pdflatex` \| `xelatex` \| `lualatex` |
| `file` | file (repetido) | Cada archivo del proyecto. El nombre del field es `file`; el `filename` del multipart es el **path relativo dentro del proyecto** (ej. `chapters/intro.tex`). |

Restricciones:
- Body total ≤ 50MB.
- ≤ 200 archivos.
- Cada `filename` validado con el helper de `packages/shared/paths.ts`.

### Response — éxito

`200 OK`, `Content-Type: multipart/mixed; boundary=...`

Dos parts:
1. `application/pdf; name="pdf"` — el PDF.
2. `text/plain; name="log"` — el log de compilación completo.

(Alternativa más simple si el frontend no quiere parsear multipart: dos endpoints separados `POST /api/compile` → `{ jobId }` + `GET /api/compile/:jobId/pdf` + `GET /api/compile/:jobId/log`, pero requiere mantener estado server-side por unos segundos. **Decisión: multipart/mixed**, mantiene el stateless absoluto.)

### Response — error de compilación

`422 Unprocessable Entity`, `Content-Type: application/json`

```json
{
  "status": "error",
  "log": "<full log>",
  "errorSummary": "! Undefined control sequence.\nl.42 \\foo"
}
```

### Response — timeout

`504 Gateway Timeout`, `Content-Type: application/json`

```json
{
  "status": "timeout",
  "log": "<partial log>",
  "durationMs": 60000
}
```

### Response — validación

`400 Bad Request` con `{ status: 'invalid', reason }`. Razones: path inválido, extensión no permitida, archivo > límite, `entryFile` no presente entre los uploads, etc.

`413 Payload Too Large` si el body > 50MB.

`429 Too Many Requests` si rate-limit por IP excedido.

`503 Service Unavailable` si el queue interno (cuando todos los slots de `p-limit` están ocupados y la cola de espera supera M) está lleno.
