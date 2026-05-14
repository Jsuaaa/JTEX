# Roadmap — jtex

Plan revisado tras el giro a **sin auth, sin persistencia, single-container, Coolify/VPS**. Las fases se colapsaron: 4 fases reales en vez de 6.

Stack cerrado (ver `architecture.md`): Vite + React + TS, CodeMirror 6, pdfjs-dist, Fastify + REST + zod, `tectonic` como subprocess, sin DB, sin Redis, un solo Dockerfile, despliegue en VPS con Coolify.

---

## Fase 0 — Setup (≈ 1 día)

**Objetivo:** monorepo arrancable con `pnpm dev`, tooling y CI básico. Cero features.

### Estructura del repo

```
jtex/
├── apps/
│   ├── web/                  # Vite + React (SPA)
│   └── api/                  # Fastify + REST + spawn tectonic
├── packages/
│   └── shared/               # zod schemas, helpers de path, tipos compartidos
├── infra/
│   └── docker/
│       ├── Dockerfile        # multi-stage (web-build, api-build, runtime)
│       └── warmup.tex        # para pre-cachear paquetes de tectonic
├── docs/                     # los 5 .md (ya creados)
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .dockerignore
└── README.md
```

Nota: ya no hay `packages/db`, `packages/storage`, ni `workers/`. El API maneja todo.

### Tareas concretas

1. `pnpm init` en raíz; crear `pnpm-workspace.yaml` con `apps/*`, `packages/*`.
2. `tsconfig.base.json` con `"strict": true`, `"moduleResolution": "bundler"`, paths.
3. ESLint flat config + Prettier en la raíz.
4. Vitest configurado en `apps/web`, `apps/api`, `packages/shared`. Playwright en `apps/web` con un test smoke.
5. `apps/web`: `pnpm create vite@latest` → React + TS. Limpiar boilerplate.
6. `apps/api`: Fastify mínimo con `GET /api/health` y un `POST /api/compile` que por ahora solo devuelve `501 Not Implemented`.
7. `packages/shared`: estructura inicial con `paths.ts` y `compile.ts` (zod schemas del contrato).
8. `infra/docker/Dockerfile`: multi-stage builder funcional aunque tectonic todavía no se use (Fase 2 lo activa).
9. `.github/workflows/ci.yml`: install + typecheck + lint + test en cada push.
10. `git init`, primer commit: `chore: scaffold monorepo`.

### Criterio de hecho

- `pnpm install && pnpm -r typecheck && pnpm -r lint && pnpm -r test` pasa.
- `pnpm --filter web dev` levanta el frontend; `pnpm --filter api dev` levanta el API.
- Desde el browser, `fetch('/api/health')` devuelve `{ ok: true }` (con proxy de Vite a `/api` apuntando al server local en dev).
- `docker build -f infra/docker/Dockerfile .` builda sin errores.
- CI verde.

### Riesgos

- Configurar el proxy Vite ↔ Fastify en dev para que `/api/*` vaya al backend. Mitigación: `server.proxy` en `vite.config.ts`.

---

## Fase 1 — Editor local end-to-end con compilador WASM stub (≈ 2–4 días)

**Objetivo:** una página donde podés cargar un `.tex` o un `.zip`, editarlo, presionar Compile y ver el PDF. Cero servidor real de compilación todavía — usamos SwiftLaTeX en el browser como stub. Este compilador WASM **se elimina al cerrar la Fase 2**; solo está para no bloquear el desarrollo del frontend mientras el Dockerfile con tectonic se cocina.

### Tareas concretas

1. Layout split-pane (editor | PDF) con `react-resizable-panels`. Árbol de archivos a la izquierda colapsable.
2. Store Zustand con la forma de `ProjectState` (ver `data-model.md` §1). **En memoria pura**, sin persist middleware.
3. CodeMirror 6 con `@codemirror/legacy-modes/mode/stex`, line numbers, theme oscuro temporal.
4. "Open file" desde `<input type="file">`: leer `.tex`, cargar al store.
5. "Open zip": `fflate` para descomprimir en memoria, popular el store, detectar `entryFile` (primer `.tex` con `\documentclass`).
6. Árbol de archivos: click cambia `activeFile`, el editor muestra el contenido.
7. Integrar SwiftLaTeX (o `texlive.js`) lazy-loaded detrás del primer click en Compile. Aceptar paquetes faltantes.
8. Botón "Compile" → WASM → recibe `Uint8Array` PDF → blob → pdfjs-dist viewer.
9. Panel inferior colapsable con el log de compilación.
10. "Download PDF" → `URL.createObjectURL` + `<a download>`.
11. "Download zip" → `fflate.zip` con todos los archivos del store.
12. Banner visible: "Modo demo — la compilación final corre en servidor. Algunos paquetes pueden fallar acá." (se quita al cerrar Fase 2).

### Criterio de hecho

- Cargo un `.tex` simple ("hello world"), edito, Compile, veo el PDF. Cargo un `.zip` de un proyecto multi-archivo, navego el árbol, edito archivos distintos, compilo. Refresh del browser = todo se pierde, comportamiento esperado.

### Riesgos

- **Tamaño del WASM bundle**: 30–60MB inicial. Mitigación: lazy-load detrás del click en Compile, no en el load inicial.

### Paralelizable

- Mientras tanto, alguien (o yo en otro día) puede construir el Dockerfile y validar tectonic localmente (Fase 2 step 1–3).

---

## Fase 2 — Compilador real (servidor `tectonic`) y deploy en Coolify (≈ 3–5 días)

**Objetivo:** reemplazar el WASM stub por el endpoint real `POST /api/compile`. Container desplegado en la VPS vía Coolify, accesible públicamente.

### Tareas concretas

1. **Dockerfile completo** (`infra/docker/Dockerfile`):
   - Stage `web-build`: builda `apps/web/dist/`.
   - Stage `api-build`: bundle de `apps/api` con tsup o esbuild (un solo `server.js`).
   - Stage `runtime`: `debian:bookworm-slim` + tectonic + texlive selectivo + biber + latexmk. Pre-warm con `warmup.tex`. Usuario no-root. Copia el bundle del API y el `dist/` del frontend a `/app/public`.
2. **Server: `POST /api/compile`** completo:
   - Multipart parser (`@fastify/multipart`).
   - Validación de cada part contra `packages/shared/paths.ts` y la whitelist de extensiones.
   - Creación de `/tmp/jobs/<jobId>`.
   - Escritura de archivos a disco.
   - `spawn('tectonic', [...])` con `cwd`, env `TECTONIC_CACHE_DIR=/var/cache/tectonic`, timeout 60s vía `AbortController` + `SIGKILL` al timeout.
   - Lectura del PDF + log.
   - Response `multipart/mixed` con pdf y log.
   - `finally`: `fs.rm` del job dir.
3. **Concurrency**: `p-limit(MAX_CONCURRENT_COMPILES)` (env var, default 2). Cola interna acotada — si > 10 esperando, `503`.
4. **Rate limit**: `@fastify/rate-limit`, 30/15min por IP.
5. **Frontend**: reemplazar el llamado al WASM por `fetch('/api/compile', { method: 'POST', body: formData })` + parser multipart en `apps/web/src/lib/multipart.ts`. Eliminar el banner "Modo demo". Eliminar el WASM compiler del bundle.
6. **Servir estáticos**: Fastify con `@fastify/static` apuntando a `/app/public`, fallback a `index.html` para rutas SPA.
7. **Logging**: `pino` con `pino-pretty` en dev, JSON en prod.
8. **Manejo legible de errores**: parser del `.log` para extraer las líneas `! ... Error:` y popular `errorSummary`.
9. **tmpfs**: configurar Coolify para montar `/tmp` como tmpfs (200–500MB).
10. **Deploy en Coolify**:
    - Conectar el repo de Git.
    - Configurar build pack: `Dockerfile` en `infra/docker/Dockerfile`.
    - Variables de entorno: `PORT=3000`, `MAX_CONCURRENT_COMPILES=2`, etc.
    - Healthcheck path: `/api/health`.
    - TLS automático.
    - Sin volúmenes persistentes.
11. **Smoke test post-deploy**: subir 3 proyectos LaTeX reales (paper con biblatex, doc con tikz, tesis con fontspec/xelatex). Si alguno falla, evaluar si conviene engordar la imagen con más paquetes texlive.

### Criterio de hecho

- El dominio público (configurado en Coolify) sirve la SPA.
- Compilo un `.tex` con TikZ y biblatex; el PDF llega en < 10s, se renderiza correctamente.
- Reinicio el container en Coolify; el sistema se recupera en segundos, sin datos residuales en disco.
- 3 proyectos LaTeX "reales" compilan exitosamente.

### Riesgos

- **Tamaño de la imagen**: 1.5–2GB. Mitigación: aceptarlo en MVP. Optimizar después si el deploy se siente lento.
- **Cold start**: tectonic frío descarga paquetes la primera vez. Mitigación: pre-warm en el `Dockerfile`.
- **Seguridad de red**: tectonic puede hacer requests al CTAN si el cache miss. Si el container tiene red abierta, esto es OK pero sería bueno cerrar la red al subprocess en Fase 4 (firejail/unshare).
- **Coolify caps**: si Coolify no expone fácil la opción de tmpfs, alternativa: que el entrypoint del container haga `mount -t tmpfs tmpfs /tmp` (requiere `CAP_SYS_ADMIN`). Validar temprano.

### Paralelizable

- Dockerfile (track A) ↔ frontend swap WASM→fetch (track B) ↔ parser de logs y UX de error (track C). En solo: secuencial pero rápido.

---

## Fase 3 — UX y diseño (≈ 4–6 días)

**Objetivo:** integrar el diseño entregado (en `design/`, ver `docs/design-integration.md`) y pulir flujos. Stack: CSS plano con custom properties (sin Tailwind), CodeMirror 6 con theme custom, pdfjs-dist, `lucide-react` para iconos.

### Tareas concretas

**Tokens y layout base**

1. Portar `design/styles.css` → `apps/web/src/styles/tokens.css` (variables `:root`, dark y light theme, paper cream/white). Aplicar `data-theme="dark"` en `<html>` por default.
2. Servir fuentes localmente (Inter, JetBrains Mono, Source Serif 4) vía `@fontsource-variable/*` — no Google Fonts en runtime.
3. Layout `App` grid (topbar / workspace / statusbar) y `workspace` grid (sidebar / editor / splitter / preview) con `react-resizable-panels` para el splitter draggable real.

**TopBar** (ajustes de §2 de `design-integration.md`) 4. Brand mark "JTEX" + breadcrumbs simplificados (`<projectName> / <activeFile>`, sin user namespace). 5. Botón Search (abre command palette client-side: fuzzy sobre paths + opcional full-text). 6. Botón Recompile primary con estado `compiling`/idle, atajo `Cmd+↵`. Toggle de auto-recompile al lado. 7. Botón Export con menú: "Download PDF" y "Download zip". 8. Botón Settings (engranaje) que abre el Settings panel. **Sin avatar, sin Share.**

**Sidebar** 9. Tabs Project / Outline. 10. Project tab: Upload (file picker) + New (proyecto vacío), file tree conectado al store Zustand, drop zone funcional (drag .tex/.bib/imágenes o .zip). 11. Outline tab: parser de `\section{}`, `\subsection{}`, `\subsubsection{}`, `\paragraph{}` del .tex activo. Click → cursor a la línea. 12. Footer del sidebar con metadata del proyecto: `<N> files · <size> · En memoria · refresh borra todo` (o `Guardado en este navegador · <ago>` si IndexedDB toggle ON).

**Editor** 13. CodeMirror 6 con `@codemirror/legacy-modes/mode/stex` + theme custom mapeando tokens del mockup (`--tk-cmd`, `--tk-math`, etc.). 14. `EditorToolbar` funcional: B/I/∑/cite/list/tbl/img/H1/H2 insertan snippets en la posición del cursor. 15. Tabs de archivos abiertos (multi-archivo simultáneo en el store: `openTabs: string[]`, `activeFile`). 16. Cursor position `Ln X, Col Y` leído del state de CodeMirror. 17. Minimap: evaluar `@replit/codemirror-minimap` u otro. Si > 30KB, omitir del MVP (el diseño sin minimap sigue siendo válido). 18. Atajos: `Cmd+S` (compile manual), `Cmd+P` (fuzzy open de archivos), `Cmd+B` (toggle PDF panel), `Cmd+/` (toggle comentario). 19. Autocompletado básico (~200 comandos LaTeX comunes) via `@codemirror/autocomplete`.

**Preview** 20. pdfjs-dist + wrapper React propio (`PdfViewer` en `components/PdfViewer.tsx`). 21. Controles del diseño: zoom −/+, paginación `‹ N/M ›`, download. 22. Status `Compiled in X.XXs` calculado con `performance.now()` en cliente. 23. Overlay con spinner mientras `compile` está en flight.

**Status bar y logs** 24. Parser de logs LaTeX en `packages/shared/src/log-parser.ts` que clasifica líneas en `ok | warn | error | info`. 25. Statusbar muestra pills `Build OK | <N> warnings | <N> errors | <engine> · TeX Live 2024` y las últimas 3 líneas de log. 26. Click en pill expande panel inferior con todo el log; click en línea con `file:line` salta el editor. 27. `Auto-save · <ago>` con tooltip explicativo del modelo en memoria.

**Settings (ex-Tweaks) y persistencia local** 28. Settings panel con: Theme (dark/light), Accent (4 swatches), Paper tone (cream/white), Editor font (4 opciones), Line numbers (toggle), Density (compact/comfortable). 29. Toggle nuevo: **"Recordar este proyecto en este navegador"** (IndexedDB). OFF por default. Tooltip que explica que vive solo en este navegador y nunca toca la VPS. 30. Persistir Settings en `localStorage` (preferencias UI, no contenido — distinto del content store).

**Recompilación y flujos** 31. Auto-recompile con debounce (3s sin tipear) detrás del toggle del topbar. OFF por default. 32. Estados vacíos: pantalla de bienvenida con drop zone grande cuando no hay proyecto cargado. 33. Mensajes de error del compilador con el `errorSummary` parseado + botón "Ver log completo".

**Accesibilidad y responsive** 34. Nav por teclado completa (skip links, focus rings visibles, ARIA labels en splitter, tree, tabs). 35. Banner "Mejor en desktop" si viewport < 1024px (mobile no es objetivo MVP).

### Criterio de hecho

- Las pantallas principales (sin proyecto / con proyecto / compilando / error) coinciden visualmente con el diseño en `design/screenshots/`, con los ajustes documentados en `design-integration.md`.
- Un usuario nuevo puede arrastrar un zip, ver el árbol, editar `main.tex`, presionar Recompile, ver el PDF en < 10s, exportar el zip. Sin instrucciones.
- Dark/light theme y los 4 accents del Tweaks funcionan y se persisten en `localStorage`.
- Toggle de IndexedDB ON sobrevive un refresh; OFF borra todo en refresh.
- Sin warnings de a11y en una pasada con axe-core.

### Riesgos

- **Mapeo del theme de CodeMirror a los tokens del diseño**: pueden faltar mapeos (ej. el modo `stex` no expone "math" como token separado; toca testear y ajustar las reglas de highlight).
- **Minimap**: si la lib elegida es pesada o tiene bugs, omitirla del MVP y dejar la columna vacía. El diseño sigue viéndose bien.
- **Drop zone con .zip grandes**: `fflate` decomprime en memoria; un zip de 50MB puede tardar y bloquear el main thread. Mitigación: hacerlo en un worker (`fflate/browser`).

### Paralelizable

- Tokens + layout (track A) ↔ TopBar + Settings panel (track B) ↔ Sidebar + Outline parser (track C) ↔ Editor CodeMirror integration (track D) ↔ Preview pdfjs (track E). Cinco tracks reales si hubiera equipo; en solo, secuencial pero cada bloque es bounded.

---

## Fase 4 — Hardening y pulido (≈ 2–3 días)

**Objetivo:** dejarlo listo para abrir al público.

### Tareas concretas

1. Sandbox de red para el subprocess: probar `firejail --net=none` o `unshare -n` en el spawn de tectonic. Si funciona en la VPS, activarlo.
2. Métricas básicas (sin tocar datos del usuario): `/api/metrics` con contadores de compilaciones totales, p50/p95/p99 de duración, % éxito vs error vs timeout. Exponer en formato Prometheus si Coolify trae monitoring; si no, un endpoint JSON simple.
3. Cloudflare delante de la VPS (free tier) para DDoS shield y caching de assets estáticos.
4. Tests E2E en Playwright para el golden path: drop zip → edit → compile → download.
5. Suite de 10 proyectos LaTeX "del mundo real" como tests de smoke en CI (corre tectonic en GHA con la misma imagen y verifica que todos compilan).
6. README con: cómo correr local, cómo desplegar a Coolify, cómo el sistema preserva privacidad (cero persistencia, link al ADR).
7. Privacy notice corta en el footer: "Tus archivos se compilan en nuestro servidor y se borran inmediatamente. No guardamos nada."
8. (Opcional, decisión solo si hay tiempo) Toggle de IndexedDB persistente del lado cliente con UI clara de "guardar / olvidar".

### Criterio de hecho

- E2E pasa en CI.
- p95 de compilación < 15s en proyectos de hasta 30 archivos.
- Página pública, dominio con TLS, footer con privacy notice.

---

## Primer commit (concreto, accionable hoy)

```bash
cd /Users/juanpablosuarezbrango/Documents/projects/jtex
git init -b main

# Crear pnpm-workspace.yaml, package.json raíz
# Crear apps/{web,api}, packages/shared, infra/docker
# tsconfig.base.json, .eslintrc, .prettierrc, .gitignore, .dockerignore

pnpm install
git add .
git commit -m "chore: scaffold monorepo with pnpm workspaces"
```

Después: tareas 1–10 de Fase 0.
