# Arquitectura — jtex

Editor LaTeX web. **Sin auth, sin cuentas, sin persistencia en servidor.** El contenido vive en el browser del usuario; el servidor solo compila on-demand y olvida.

Despliegue: **VPS propia con Coolify**, una sola imagen Docker.

---

## 1. Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser (SPA)                          │
│                                                              │
│  ┌─────────────┐   ┌────────────────────────────────────┐    │
│  │ File tree   │   │ Editor (CodeMirror 6)              │    │
│  │ + Open zip  │   └──────────────┬─────────────────────┘    │
│  └─────────────┘                  │                          │
│                                   ▼                          │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Project state en memoria (Zustand)                  │     │
│  │  - Map<path, content>                               │     │
│  │  - entryFile, engine                                │     │
│  │  - lastCompile: { pdfBlob, log, status }            │     │
│  └──────┬──────────────────────────────────────────────┘     │
│         │                                                    │
│         │ click "Compile"                                    │
│         │ POST /api/compile  (multipart con todos los files) │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ PDF Viewer (pdfjs-dist) ← Blob URL del PDF recibido │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│         Single Container (VPS / Coolify)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Fastify server (Node + TS)                           │    │
│  │  - GET /*           → sirve el SPA build estático    │    │
│  │  - POST /api/compile → multipart in, PDF out         │    │
│  │  - GET  /api/health  → { ok: true }                  │    │
│  └────────────┬─────────────────────────────────────────┘    │
│               │ spawn (concurrency-limited)                  │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ tectonic / latexmk                                   │    │
│  │  CWD: /tmp/jobs/<jobId>  (tmpfs, max 200MB)          │    │
│  │  --net=none enforced en el entrypoint del container  │    │
│  │  sin -shell-escape, sin red, timeout 60s             │    │
│  │  Al terminar (éxito o error):                        │    │
│  │    1. Stream del PDF (o del log) al response         │    │
│  │    2. rm -rf /tmp/jobs/<jobId>                       │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

Container restart → /tmp se vuela entero (es tmpfs). Cero residuos.
```

**Propiedades del sistema:**

- **Stateless puro:** la VPS no guarda nada del usuario en disco persistente.
- **Privado por default:** ningún archivo del usuario sobrevive al final del request HTTP.
- **Resiliente:** si Coolify reinicia el container, no hay datos que recuperar.
- **Simple de operar:** un solo proceso, un solo container, un solo Dockerfile.

---

## 2. Flujo de compilación (request-by-request)

1. El usuario edita en el browser. El estado vive en Zustand (memoria de la pestaña).
2. Hace click en "Compile" (o autocompila después de N segundos sin tipear).
3. El cliente arma un `multipart/form-data` con:
   - Cada archivo del proyecto como una `part` (`path` en el nombre, contenido como body).
   - Campos: `entryFile`, `engine`.
4. El servidor:
   - Crea `/tmp/jobs/<jobId>` (uuid).
   - Valida cada part: extensión whitelisteada, path sin `..` ni `/` inicial, tamaño total ≤ 50MB.
   - Escribe los archivos a disco (en tmpfs).
   - `spawn('tectonic', ['--keep-logs', '--outdir=.', entryFile])` con `cwd=/tmp/jobs/<jobId>`, sin red, timeout 60s.
   - **Si éxito:** stream del PDF como `application/pdf`. Header `X-Compile-Log: <truncated url-encoded log>` o response multipart con `pdf` y `log`.
   - **Si error:** `422` con `application/json` `{ status: 'error', log, errorSummary }`.
   - **Si timeout:** `504` con `{ status: 'timeout', log }`.
   - Siempre, en `finally`: `rm -rf /tmp/jobs/<jobId>`.
5. El cliente recibe el PDF como blob → `URL.createObjectURL` → lo pasa al pdfjs viewer.

**Sin colas, sin workers separados, sin jobs persistentes.** La compilación ocurre en el mismo proceso Node, en el mismo container. Concurrencia limitada por un semáforo en memoria (`p-limit(N)` donde N = cores de la VPS).

---

## 3. Decisiones por componente

### 3.1 Frontend framework

**[ELEGIDA] Vite + React + TypeScript.** Misma justificación que antes (SPA pura, deploy estático). Sin cambios.

### 3.2 Editor de código

**[ELEGIDA] CodeMirror 6** con `@codemirror/legacy-modes/mode/stex`. Sin cambios.

### 3.3 Renderizado de PDF

**[ELEGIDA] pdfjs-dist** directo, wrapper React mínimo propio. Sin cambios.

### 3.4 Compilación LaTeX

| Opción                                             | Trade-off                                                                                                                                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`tectonic` en el mismo proceso Fastify** (spawn) | Single container, sin cola, sin worker separado. Latencia menor (no hay round-trip a una cola). Tectonic descarga paquetes on-demand del CTAN mirror la **primera** vez y los cachea en `/var/cache/tectonic` dentro de la imagen. |
| Worker separado + cola                             | Mejor aislamiento entre jobs, pero overkill para single-tenant VPS sin persistencia. Suma Redis o pg-boss sin razón.                                                                                                               |
| WASM en cliente                                    | Descartado por soporte incompleto de paquetes (ver ADR-004 en `decisions-log.md`).                                                                                                                                                 |

**[ELEGIDA] `tectonic` corriendo como subprocess de Fastify, en el mismo container.** Concurrencia limitada en memoria con `p-limit`. Sin cola externa.

Notas:

- Pre-warm de paquetes: en el `Dockerfile`, durante el build, compilar un `warmup.tex` que incluya `tikz`, `biblatex`, `fontspec`, `amsmath`, etc., para llenar el cache de tectonic en la imagen. Así el primer request real de un usuario no espera la descarga inicial.
- Si en algún caso real tectonic falla por un paquete missing, fallback a `latexmk -pdf` con texlive instalado en la misma imagen (suma ~1GB; aceptable en una VPS).

### 3.5 Backend / API

**[ELEGIDA] Node + Fastify + TypeScript.** Endpoints pequeños; **REST plano** en vez de tRPC.

Razón del cambio respecto al plan anterior: con auth y persistencia eliminadas, quedan 2 endpoints útiles (`POST /api/compile`, `GET /api/health`). tRPC suma boilerplate sin pagar la inversión. Los tipos del request/response se comparten via `packages/shared` (zod schemas).

### 3.6 Storage

**[ELEGIDA] tmpfs dentro del container** para los jobs de compilación. Sin persistencia. El contenido del usuario vive en el browser (Zustand en memoria por default; IndexedDB opcional con toggle en Fase 4).

### 3.7 Base de datos

**Eliminada.** No hay nada que persistir.

### 3.8 Cola de jobs

**Eliminada.** `p-limit(N)` en memoria reemplaza BullMQ/Redis para single-VPS.

### 3.9 Auth

**Eliminada permanentemente.** El producto es libre y anónimo. Cualquier abuse-mitigation se hace por rate-limit por IP, no por cuenta (ver §5).

### 3.10 Hosting / Despliegue

**[ELEGIDA] VPS propia, orquestada con Coolify, un solo Dockerfile multi-stage.**

- **Dockerfile** (estructura):
  1. **Stage `web-build`:** `node:20-alpine`. `pnpm install && pnpm --filter web build` → genera `apps/web/dist/`.
  2. **Stage `api-build`:** `node:20-alpine`. `pnpm install && pnpm --filter api build` → bundle del server (tsup o esbuild).
  3. **Stage `runtime`:** base con TeX Live + tectonic preinstalados (ver §4). Copia el bundle del API + el `dist/` del frontend. Fastify sirve estáticos desde `/` y los endpoints desde `/api/*`.
- **Coolify** detecta el `Dockerfile`, builda, expone el puerto (3000), gestiona TLS con Let's Encrypt, hace los restarts.
- **tmpfs** montado en `/tmp` via Coolify (configurable en la sección de volumes; alternativa: el propio container hace `mount -t tmpfs tmpfs /tmp` en su entrypoint si corre privileged, pero preferible setearlo desde Coolify).
- **Sin volúmenes persistentes.** Coolify config: zero persistent volumes.

---

## 4. Imagen Docker — composición

Base recomendada: **`debian:bookworm-slim` + tectonic + texlive-binaries selectos**.

```dockerfile
# Stage runtime (resumen — el archivo final va en infra/docker/)
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates fontconfig \
      texlive-latex-base texlive-latex-recommended \
      texlive-fonts-recommended texlive-latex-extra \
      texlive-bibtex-extra biber latexmk \
      tectonic \
    && rm -rf /var/lib/apt/lists/*

# Pre-warm de tectonic con un .tex que usa paquetes comunes
COPY infra/docker/warmup.tex /tmp/warmup/warmup.tex
RUN cd /tmp/warmup && tectonic warmup.tex || true && rm -rf /tmp/warmup

# Usuario no-root
RUN useradd --system --no-create-home --shell /usr/sbin/nologin app
USER app
WORKDIR /app

COPY --chown=app:app apps/api/dist /app
COPY --chown=app:app apps/web/dist /app/public

ENV NODE_ENV=production \
    PORT=3000 \
    JOBS_DIR=/tmp/jobs \
    MAX_CONCURRENT_COMPILES=2 \
    COMPILE_TIMEOUT_MS=60000 \
    MAX_PROJECT_BYTES=52428800

EXPOSE 3000
CMD ["node", "/app/server.js"]
```

Tamaño esperado: ~1.5–2GB. Aceptable para un build en VPS dedicada.

Si se vuelve un problema, alternativa más liviana: solo `tectonic` (sin texlive-extra), ~250MB. Riesgo: algunos paquetes (biblatex con backends complejos, fontspec con fuentes raras) no resolverán.

---

## 5. Abuse mitigation (sin auth)

Sin cuentas, el rate-limit por IP es la única defensa.

- `POST /api/compile`: **30 requests / 15 min / IP** vía `@fastify/rate-limit` (storage en memoria del proceso; al reiniciar se resetea — coherente con el resto).
- Max body size del request: 50MB (Fastify config).
- Whitelist de extensiones de archivo: `.tex`, `.bib`, `.cls`, `.sty`, `.bst`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.eps`, `.svg`, `.tikz`. Cualquier otra extensión en el multipart → `400`.
- Validación de paths: no `..`, no leading `/`, no caracteres de control. Helper compartido en `packages/shared/paths.ts`.
- Concurrency cap global: `p-limit(MAX_CONCURRENT_COMPILES)`. Requests que entran cuando ya hay N corriendo esperan; si el queue interno supera M (ej. 10), responden `503 Try Again`.
- Timeout duro 60s al `spawn`. Tras el timeout, `SIGKILL` al proceso de tectonic y `rm -rf` del job dir.

Si la VPS recibe abuso real (cripto-miner, bots), agregar Cloudflare delante (free tier) para shield.

---

## 6. Restricciones de seguridad para compilación

Las mismas de antes, aplicadas ahora a un subprocess en vez de un container por job:

1. Sin red en el proceso de tectonic: imposible 100% sin namespaces, pero se mitiga así:
   - tectonic, después del warmup en build-time, **no necesita red** para los paquetes ya cacheados. Si se setea `TECTONIC_CACHE_DIR=/var/cache/tectonic` y se hace warmup, los runtime requests no salen.
   - Para defensa real, encerrar el spawn con `unshare -n` en Linux (requiere caps) o `firejail --net=none`. En VPS con kernel reciente y Coolify, `unshare -n` desde el proceso Node es factible si el container corre con `CAP_SYS_ADMIN`. **Trade-off de seguridad vs simplicidad** — decisión: empezar sin sandbox de red (el binario tiene 0 known RCE), y agregar `firejail` en Fase 4 si el producto se hace público.
2. Sin `-shell-escape`. Tectonic por default no lo soporta — bien.
3. Usuario no-root (`USER app` en el Dockerfile). Aplica al spawn también.
4. tmpfs para `/tmp/jobs/` con tamaño limitado por kernel.
5. Timeout duro 60s; al timeout, `process.kill('SIGKILL')`.
6. `finally` con `fs.rm(jobDir, { recursive: true, force: true })`. Si falla, log y seguir — el container se va a reiniciar eventualmente y volará todo.

---

## 7. Resumen de stack elegido (actualizado)

| Capa                | Decisión                                                             |
| ------------------- | -------------------------------------------------------------------- |
| Frontend            | Vite + React + TypeScript                                            |
| Estado del proyecto | Zustand en memoria (default). IndexedDB opcional Fase 4.             |
| Editor              | CodeMirror 6 (`stex`)                                                |
| PDF viewer          | pdfjs-dist                                                           |
| Compilación         | `tectonic` (subprocess de Fastify) + fallback `latexmk` con TeX Live |
| API                 | Node + Fastify + TypeScript, **REST** (no tRPC)                      |
| Tipos compartidos   | `packages/shared` con zod schemas                                    |
| Cola                | `p-limit(N)` en memoria — sin Redis, sin BullMQ                      |
| DB                  | Ninguna                                                              |
| Storage             | tmpfs `/tmp/jobs/` dentro del container; cero persistencia           |
| Auth                | Ninguna                                                              |
| Despliegue          | **Coolify en VPS, un único Dockerfile multi-stage**                  |
| Rate limit          | `@fastify/rate-limit` por IP, in-memory                              |

Costo operativo: **el de la VPS que ya tenés**. Sin servicios externos.
