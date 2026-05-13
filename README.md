# jtex

Editor LaTeX web. Subí un `.tex` o un `.zip`, editá, previsualizá y exportá. **Sin cuentas, sin almacenamiento server-side**: tu contenido vive en el navegador y se borra al refrescar. La VPS solo recibe los archivos durante la compilación, genera el PDF y los olvida.

## Stack

- **Frontend**: Vite + React + TypeScript, CodeMirror 6, pdfjs-dist, Zustand.
- **Backend**: Fastify + multipart, spawn `tectonic` (con texlive como fallback).
- **Shared**: zod schemas, path validation, log parser (`packages/shared`).
- **Despliegue**: un Dockerfile multi-stage en `infra/docker/Dockerfile`, listo para Coolify.

Decisiones de arquitectura: ver `docs/` (architecture, data-model, api, roadmap, decisions-log, design-integration).

## Desarrollo local

```bash
pnpm install
pnpm dev            # web (5173) + api (3000) en paralelo
```

Vite proxea `/api/*` al backend en `localhost:3000`. Para que la compilación funcione localmente necesitás `tectonic` instalado:

```bash
# macOS
brew install tectonic
```

Sin `tectonic` local, la web funciona pero `POST /api/compile` fallará con `ENOENT`. Para probar end-to-end sin instalar tectonic, usá el container:

```bash
docker build -f infra/docker/Dockerfile -t jtex .
docker run --rm -p 3000:3000 jtex
# abrí http://localhost:3000
```

## Comandos útiles

```bash
pnpm dev              # dev mode (web + api)
pnpm -r typecheck     # tipos
pnpm lint             # ESLint
pnpm -r test          # vitest
pnpm -r build         # build de prod (web → dist/, api → dist/)
```

## Despliegue en Coolify

1. Conectá este repo a Coolify.
2. Build pack: **Dockerfile**, path `infra/docker/Dockerfile`.
3. Puerto: `3000`. Healthcheck: `/api/health`.
4. Variables de entorno relevantes (todas tienen defaults sanos):
   - `MAX_CONCURRENT_COMPILES` (default `2`)
   - `COMPILE_TIMEOUT_MS` (default `60000`)
   - `MAX_PROJECT_BYTES` (default `52428800` = 50MB)
5. **Sin volúmenes persistentes.** `/tmp/jtex-jobs/` es efímero y se limpia tras cada compile.
6. Reiniciar el container vuela cualquier estado residual.

## Privacidad

- No hay base de datos.
- No hay object storage persistente.
- Los archivos del usuario solo existen en `/tmp/jtex-jobs/<uuid>/` durante el request HTTP de compilación; al terminar (éxito, error o timeout), el directorio se borra.
- El estado del proyecto en el cliente vive en memoria (Zustand). Refresh = se pierde todo. Las **preferencias UI** (tema, acento, fuente) sí se guardan en `localStorage` porque son configuración del navegador, no contenido del usuario.

## Estructura del repo

```
apps/
  api/                 # Fastify + tectonic spawn
  web/                 # Vite + React SPA
packages/
  shared/              # zod schemas, helpers compartidos
infra/
  docker/              # Dockerfile multi-stage + warmup.tex
design/                # diseño UI de referencia (HTML+CSS+JSX)
docs/                  # arquitectura, decisiones, roadmap
```
