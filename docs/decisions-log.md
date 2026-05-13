# ADR Log — jtex

Architecture Decision Records (formato lite). Cada decisión: contexto, decisión, alternativas descartadas, consecuencias. Nuevas decisiones se appendean al final.

---

## ADR-001 — Stack TypeScript end-to-end
**Fecha:** 2026-05-13
**Contexto:** Hay que elegir lenguajes para frontend, API y worker. El proyecto es solo dev, MVP en pocas semanas.
**Decisión:** TypeScript en frontend, API y worker.
**Alternativas descartadas:** Python en el backend (FastAPI). Habría sido idiomático para orquestar TeX Live, pero rompe el flujo de tipos compartidos con el frontend y obliga a mantener dos toolchains.
**Consecuencias:** Tipos compartidos vía tRPC sin codegen. Una sola toolchain (pnpm + tsc + vitest). El worker corre Node, no Python — orquestar `tectonic` desde Node con `child_process.spawn` es trivial.

---

## ADR-002 — Vite + React (no Next.js)
**Fecha:** 2026-05-13
**Contexto:** Elegir framework de frontend. La app es un editor SPA con dos paneles pesados (CodeMirror + pdfjs).
**Decisión:** Vite + React + TypeScript.
**Alternativas descartadas:** Next.js (SSR/RSC no aporta a una app client-heavy; las API routes serían redundantes con el servicio API separado), SvelteKit (ecosistema de editores está en React).
**Consecuencias:** Build estático deployable a CDN puro (Cloudflare Pages). Sin sobrecarga de RSC. Si en el futuro necesitamos SEO de landing pages, se puede agregar un sub-proyecto Astro/Next solo para marketing.

---

## ADR-003 — CodeMirror 6 como editor
**Fecha:** 2026-05-13
**Contexto:** Elegir editor de código embebible.
**Decisión:** CodeMirror 6 con `@codemirror/legacy-modes/mode/stex`.
**Alternativas descartadas:** Monaco (3MB+ de bundle, arrastra workers de TS que no necesitamos, peor en mobile).
**Consecuencias:** Bundle 10–20x más chico. Excelente extensibilidad por sistema de extensiones. Para autocompletado avanzado de LaTeX a futuro hay que construir más manualmente que con Monaco, costo aceptable.

---

## ADR-004 — Compilación LaTeX en servidor (TeX Live + Docker), no WASM
**Fecha:** 2026-05-13
**Contexto:** Decisión crítica del proyecto. Dos opciones: compilar en servidor con TeX Live en Docker, o en cliente con WASM (SwiftLaTeX, Tectonic-WASM).
**Decisión:** Servidor con TeX Live en Docker, usando `tectonic` como compilador primario (fallback a `latexmk` con texlive-full si paquetes faltan).
**Alternativas descartadas:**
- WASM puro: tamaño del bundle (30–60MB + paquetes on-demand), soporte incompleto de paquetes comunes (biblatex con ciertos backends, fontspec XeLaTeX, TikZ pesado), límites de memoria del navegador (~2GB) que rompen con docs grandes, errores opacos difíciles de debuggear, prácticamente inviable en mobile.
- Híbrido (WASM client + servidor fallback): duplica la superficie de compilación; cuando ambos compilan distinto, el bug es infernal de reproducir.
**Consecuencias:**
- Hay que mantener infra de compilación (Fly.io machines, imagen Docker). Costo ≈ $2–10/mes para tráfico MVP.
- Superficie de seguridad: hay que sandboxear (sin red, sin shell-escape, no-root, timeout duro). Checklist en `architecture.md` §3.
- Cualquier doc LaTeX "real" funciona — no hay "depende de tu navegador y de qué paquete usas".
- WASM se usa **solo** en Fase 1 como stub para tener un demo navegable sin infra. Se elimina al cerrar Fase 2.

---

## ADR-005 — Fastify + tRPC sobre NestJS
**Fecha:** 2026-05-13
**Contexto:** Elegir framework de API.
**Decisión:** Fastify + tRPC.
**Alternativas descartadas:** NestJS (decorators, DI, modules — ceremonia injustificada para un servicio chico de un dev solo).
**Consecuencias:** Menos código boilerplate. Para hacer testing es más manual (sin DI), pero el dominio es chico. Si crece a > 50 endpoints o múltiples devs, reconsiderar.

---

## ADR-006 — Postgres (Neon) para metadata, R2 para contenido
**Fecha:** 2026-05-13
**Contexto:** Dónde guardar archivos del proyecto del usuario. Tres opciones: blob en DB, filesystem, object storage.
**Decisión:** Metadata en Postgres (Neon free tier). Contenido de archivos en Cloudflare R2.
**Alternativas descartadas:**
- Filesystem: rompe en cuanto API y worker viven en máquinas distintas.
- Blob en DB: caro, malo para PDFs grandes, complica backups.
- SQLite + Litestream: bueno para single-VPS pero choca con la separación API/worker.
**Consecuencias:** Dos sistemas a mantener consistentes (transacción DB + upload R2 con compensación si una falla). Costo casi cero en MVP. R2 sin egress es lo que hace este modelo barato a escala.

---

## ADR-007 — BullMQ + Redis (Upstash) para cola de jobs
**Fecha:** 2026-05-13
**Contexto:** Compilar in-process en la API es inviable (jobs largos, container distinto). Se necesita una cola.
**Decisión:** BullMQ sobre Redis (Upstash serverless free tier).
**Alternativas descartadas:** `pg-boss` (cola sobre Postgres, ahorra una dependencia pero peor para fan-out y pub/sub para suscripciones de status), SQS (más friction de tooling local).
**Consecuencias:** Una dependencia más en la arquitectura. Beneficio: pub/sub de Redis sirve también para empujar updates de `compile_jobs.status` al cliente vía SSE.

---

## ADR-008 — tRPC + dos endpoints REST (upload zip, redirect PDF)
**Fecha:** 2026-05-13
**Contexto:** API style. REST puro vs GraphQL vs tRPC.
**Decisión:** tRPC para todo, excepto `POST /upload/zip` (multipart) y `GET /pdf/:jobId` (redirect a R2 signed URL).
**Alternativas descartadas:** GraphQL (overkill, dev solo, sin múltiples clientes), REST puro (codegen u OpenAPI manual para mantener tipos del cliente — fricción innecesaria con stack TS).
**Consecuencias:** Cliente importa los tipos del router directamente. Las dos excepciones REST son por requisitos de transporte y están documentadas en `api.md`.

---

## ADR-009 — Sin auth en Fase 1–2; Clerk desde Fase 3
**Fecha:** 2026-05-13
**Contexto:** Cuándo introducir auth, y con qué proveedor.
**Decisión:** Fase 1 y 2 corren single-tenant (un usuario sintético `local-dev`). En Fase 3 se introduce Clerk.
**Alternativas descartadas:** Lucia (más OSS-puro pero requiere construir UI de signup/login/forgot/verify — costo de tiempo alto para MVP), NextAuth (atado a Next.js, que no usamos).
**Consecuencias:** Vendor lock-in moderado a Clerk. Migración a Lucia es factible si crece el proyecto. Permite priorizar Fase 1–2 sin distraerse con auth.

---

## ADR-010 — Sin versionado de archivos en MVP
**Fecha:** 2026-05-13
**Contexto:** ¿Cada save sobreescribe, o guardamos versiones?
**Decisión:** Sin versionado. Cada save al mismo path sobreescribe el blob en R2.
**Alternativas descartadas:** Content-addressable blobs + tabla `file_versions` (correcto a largo plazo, costo de complejidad alto para MVP).
**Consecuencias:** No hay undo entre sesiones. CodeMirror tiene undo intra-sesión, suficiente para MVP. Plan de extensión documentado en `data-model.md` §2.

---

## ADR-011 — Hosting: Cloudflare Pages (FE) + Fly.io (API + worker)
**Fecha:** 2026-05-13
**Contexto:** Elegir plataforma de hosting.
**Decisión:** CF Pages para el frontend estático. Fly.io para API y compile worker (misma región).
**Alternativas descartadas:** VPS único en Hetzner (más barato pero más ops manual, no scale-to-zero), Cloud Run (cold starts más largos para imágenes pesadas, latencia más alta a R2 sin acuerdo).
**Consecuencias:** Costo total < $10/mes en MVP. API y worker en la misma región evita egress entre ellos. CDN gratis para el frontend.

**SUPERSEDED por ADR-012** (mismo día). El usuario ya tiene una VPS propia y prefiere desplegar todo ahí con Coolify, en un único container, sin servicios externos.

---

## ADR-012 — Producto sin auth, sin persistencia, single-container en VPS con Coolify
**Fecha:** 2026-05-13
**Contexto:** El usuario explicitó: (1) producto libre (sin auth), (2) datos del usuario en el browser, no en la VPS, (3) borrarse al refrescar la página o al reiniciar el servidor, (4) despliegue con Dockerfile en su VPS usando Coolify. Esto invalida buena parte de las ADRs 006, 007, 009 y 011.
**Decisión:**
- **Sin auth permanentemente.** El producto es anónimo.
- **Sin DB, sin Redis, sin object storage.** La VPS no guarda nada del usuario.
- **Estado del proyecto en el browser** (Zustand en memoria). Persistencia local opcional con IndexedDB en Fase 3+, OFF por default.
- **Compilación stateless por request:** `POST /api/compile` recibe los archivos en multipart, compila en `/tmp/jobs/<jobId>` (tmpfs), devuelve PDF + log en `multipart/mixed`, borra el job dir en `finally`.
- **Un único Dockerfile multi-stage** (`infra/docker/Dockerfile`): frontend build + API + tectonic + texlive. Coolify lo orquesta. Sin volúmenes persistentes.
- **`tectonic` como subprocess de Fastify**, no un worker separado. `p-limit(N)` en memoria reemplaza BullMQ.
- **Rate limit** por IP (no por cuenta) con `@fastify/rate-limit` in-memory.
**Alternativas descartadas:**
- Stack anterior (Clerk + Neon + R2 + Upstash + Fly.io con worker separado): correcto para producto multi-tenant con cuentas, pero overkill cuando el modelo es anónimo y efímero. Sumaba 4 servicios externos y costo recurrente.
- Storage server-side encriptado por sesión: añade complejidad sin valor — si el usuario va a perder los datos al refrescar igual, no hay razón para que la VPS los toque.
- WASM puro en cliente (sin servidor de compilación): descartado en ADR-004 por soporte de paquetes; se mantiene como **stub solo en Fase 1** del desarrollo.
**Consecuencias:**
- Costo operativo: **solo la VPS que ya tenés**.
- Privacidad por diseño: ningún archivo del usuario sobrevive al request HTTP.
- Resiliencia: reiniciar el container no causa pérdida de datos (no hay datos que perder).
- Operación más simple: un Dockerfile, un container, un deploy. Sin migrations, sin schemas, sin colas externas.
- Limitación: sin cuentas, no hay "mis proyectos" guardados en el servidor. El usuario que quiera persistencia tendrá que activar el toggle local (IndexedDB) en Fase 3+ o exportar/reimportar zips manualmente. Aceptado.
- Las ADRs 006 (Postgres + R2), 007 (BullMQ + Redis), 009 (Clerk en Fase 3), 011 (CF Pages + Fly.io) quedan **superseded** por ésta.

---

## ADR-008-bis — REST + zod compartido en vez de tRPC
**Fecha:** 2026-05-13
**Contexto:** ADR-008 eligió tRPC asumiendo un router de ~15 procedimientos (CRUD de proyectos, archivos, jobs). Con ADR-012, el router quedó en 1 endpoint útil (`POST /api/compile`).
**Decisión:** REST plano + zod schemas compartidos en `packages/shared`. Sin tRPC.
**Alternativas descartadas:** Mantener tRPC: suma boilerplate (adapter, react-query setup) sin pagar la inversión para 1 endpoint.
**Consecuencias:** Cliente y servidor importan los mismos schemas zod. Tipado end-to-end sin codegen. Si en el futuro reaparece un router amplio, reintroducir tRPC es trivial.

---

## ADR-013 — Datos del usuario en memoria del browser por default; IndexedDB opcional y off
**Fecha:** 2026-05-13
**Contexto:** El requirement fue "que se borre al reiniciar la página". Dos lecturas: memoria pura (refresh = pierdo todo) o IndexedDB (persiste entre refreshes en el mismo browser).
**Decisión:** Default **memoria pura** (Zustand sin persist). El refresh borra todo, intencionalmente. En Fase 3 se agrega un toggle "Recordar este proyecto en mi navegador" que activa snapshot a IndexedDB; **OFF por default**.
**Alternativas descartadas:**
- IndexedDB siempre on: contradice la lectura literal del requirement.
- Solo memoria, sin opción de IndexedDB jamás: frustración alta si el usuario refresca por accidente en un proyecto largo.
**Consecuencias:** Comportamiento default coherente con "cero rastro". Quien quiera persistir, lo elige explícitamente y entiende que vive en su navegador, no en la VPS.
