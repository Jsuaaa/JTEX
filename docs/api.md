# Contrato de API — jtex

**Estilo: REST plano.** Sin tRPC, sin GraphQL. Hay 2 endpoints útiles. Los tipos del request/response se comparten en `packages/shared` con zod schemas (validación en el server, parsing en el cliente).

Razón del cambio: con auth y persistencia eliminadas, ya no hay un router amplio que justifique tRPC. REST con 2 endpoints + tipos compartidos vía zod es más simple.

---

## 1. Endpoints

### `POST /api/compile`

Compila un proyecto LaTeX y devuelve el PDF resultante. **Stateless**: el servidor recibe los archivos en el request, compila, devuelve, y olvida.

**Request:** `multipart/form-data`

| Field | Tipo | Requerido | Notas |
|---|---|---|---|
| `entryFile` | text | sí | Path relativo del `.tex` principal, ej. `main.tex`. Debe estar entre los `file` uploads. |
| `engine` | text | no (default `tectonic`) | `tectonic` \| `pdflatex` \| `xelatex` \| `lualatex` |
| `file` | file (repetido, N veces) | sí (≥ 1) | Cada archivo del proyecto. `filename` del multipart = path relativo (ej. `chapters/intro.tex`). |

Validaciones (todas server-side, espejadas en el cliente para feedback temprano):
- Body total ≤ 50MB.
- ≤ 200 files.
- Paths: helper `packages/shared/paths.ts` (no `..`, no leading `/`, sin caracteres de control, extensión whitelisteada).
- `entryFile` debe aparecer en los uploads.

**Response 200 OK — éxito**
`Content-Type: multipart/mixed; boundary=jtex-XXXX`

```
--jtex-XXXX
Content-Type: application/pdf
Content-Disposition: form-data; name="pdf"

<bytes del PDF>
--jtex-XXXX
Content-Type: text/plain; charset=utf-8
Content-Disposition: form-data; name="log"

<contenido del .log>
--jtex-XXXX--
```

El frontend parsea ambos parts (helper en `apps/web/src/lib/multipart.ts`).

**Response 422 Unprocessable Entity — error de compilación**
```json
{
  "status": "error",
  "log": "...",
  "errorSummary": "! Undefined control sequence.\nl.42 \\foo"
}
```

**Response 504 — timeout**
```json
{ "status": "timeout", "log": "...", "durationMs": 60000 }
```

**Response 400 — validación**
```json
{ "status": "invalid", "reason": "path traversal in file 'chapters/../etc/passwd'" }
```

**Response 413** — body > 50MB.
**Response 429** — rate-limit.
**Response 503** — queue interno saturado.

### `GET /api/health`

Healthcheck para Coolify y monitoring.

**Response 200:**
```json
{ "ok": true, "version": "0.1.0", "tectonic": "0.15.0" }
```

---

## 2. Rate limit

`@fastify/rate-limit` con storage in-memory:

| Endpoint | Límite |
|---|---|
| `POST /api/compile` | 30 / 15 min / IP |
| `GET /api/health` | sin límite |

Headers de respuesta estándar: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

Al reiniciar el container, los contadores se resetean (consistente con el resto del sistema).

---

## 3. Tipos compartidos (zod schemas en `packages/shared`)

```ts
// packages/shared/src/compile.ts (forma conceptual)
import { z } from 'zod';

export const Engine = z.enum(['tectonic', 'pdflatex', 'xelatex', 'lualatex']);
export type Engine = z.infer<typeof Engine>;

export const RelativePath = z.string()
  .min(1)
  .max(255)
  .refine(s => !s.startsWith('/') && !s.startsWith('\\'))
  .refine(s => !s.split(/[/\\]/).includes('..'))
  .refine(s => !/[\x00-\x1f]/.test(s));

export const AllowedExt = /\.(tex|bib|cls|sty|bst|pdf|png|jpg|jpeg|eps|svg|tikz)$/i;

export type CompileSuccess = { pdf: Blob; log: string };
export type CompileError =
  | { status: 'error'; log: string; errorSummary: string }
  | { status: 'timeout'; log: string; durationMs: number }
  | { status: 'invalid'; reason: string };
```

El cliente usa estos types y schemas para construir el multipart y parsear la respuesta. El server importa los mismos para validar.

---

## 4. Por qué no tRPC

Decisión revisada (ver ADR-008-bis en `decisions-log.md`). En la arquitectura anterior tRPC se justificaba por un router de ~15 procedimientos para CRUD de proyectos, archivos y jobs. Con el giro a **sin persistencia ni auth**, el router quedó en 1 endpoint útil. Mantener tRPC para 1 endpoint suma boilerplate (server adapter, react-query, contexts) sin pagar la inversión. REST + zod schemas compartidos es más liviano y tan tipado como tRPC en la práctica.

Si en el futuro reaparece un router más amplio (ej. modo "mi cuenta" opcional), reintroducir tRPC es trivial.
