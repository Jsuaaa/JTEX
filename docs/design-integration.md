# Integración del diseño — jtex

El diseño entregado vive en `design/` (`index.html`, `app.jsx`, `document.jsx`, `tweaks-panel.jsx`, `styles.css`, `screenshots/`). Es un mockup HTML+React+CSS standalone (vía Babel CDN). **Este documento define cómo se traslada al stack real (Vite + React + TS)** y qué partes del diseño chocan con las decisiones de arquitectura ya cerradas (ADR-012: sin auth, sin persistencia).

---

## 1. Lo que se porta tal cual

Estos componentes y tokens del diseño van directo a `apps/web/src/`, traducidos a TS y a la arquitectura real.

### Tokens CSS (`design/styles.css` → `apps/web/src/styles/tokens.css`)
- Variables CSS del tema dark y light, `data-theme="dark|light"` y `data-paper="cream|white"` en `<html>`.
- Acento por default: `#d97757`.
- Fuentes: Inter (UI), JetBrains Mono (editor), Source Serif 4 (preview cuando aplique).
- Dimensiones: `--topbar-h: 48px`, `--status-h: 32px`, `--sidebar-w: 248px`, `--radius: 6px`.
- Colores de syntax tokens para el editor (`--tk-cmd`, `--tk-math`, `--tk-comment`, etc.) — se mapean a un theme custom de CodeMirror 6.

Decisión: no usar Tailwind. El diseño ya está en CSS plano con custom properties; mantenerlo así evita un layer de abstracción innecesario.

### Layout
- `App` grid: `topbar` (48px) / `workspace` (1fr) / `statusbar` (32px).
- `workspace` grid: `sidebar` (248px) / `editor` (1fr) / `splitter` (4px) / `preview` (1fr).
- Splitter draggable: reemplazar el div estático del mockup por `react-resizable-panels` para que sea redimensionable real.

### Componentes (mapeo 1:1)

| Mockup | Componente real | Notas |
|---|---|---|
| `TopBar` | `apps/web/src/components/TopBar.tsx` | Ver §2 para ajustes (sin avatar, sin share). |
| `Sidebar` / `FileNode` | `components/Sidebar.tsx`, `components/FileTree.tsx` | Drop zone funcional, tabs Project/Outline. |
| `EditorToolbar` | `components/EditorToolbar.tsx` | Inserta snippets en CodeMirror. |
| `EditorPane` | `components/EditorPane.tsx` | El cuerpo del editor es CodeMirror 6, **no** la versión char-by-char del mockup. |
| `PreviewPane` | `components/PreviewPane.tsx` | El cuerpo es pdfjs-dist, **no** KaTeX. |
| `StatusBar` | `components/StatusBar.tsx` | Conectado al parser de logs. |
| `TweaksPanel` | `components/SettingsPanel.tsx` | Renombrar y persistir el ajuste en `localStorage` (preferencias UI sí son OK en local — distinto de "contenido del proyecto"). |

---

## 2. Ajustes obligatorios por la arquitectura (sin auth, sin persistencia)

El mockup asume un producto multi-tenant. Estos elementos se modifican:

### 2.1 Breadcrumbs
Mockup: `jtellez / sgd-paper / main.tex`
Real: `<projectName> / <activeFile>` (sin segmento de usuario).
- Si no hay proyecto cargado: solo el nombre del archivo abierto, o un placeholder `Untitled`.

### 2.2 Avatar `JT`
**Quitar.** En su lugar, un botón de **engranaje** (Settings) que abre el panel de Tweaks. Misma posición en el topbar.

### 2.3 Botón Share
**Quitar.** No hay link compartible sin storage. Si en el futuro se agrega "export-to-paste" (subir el zip a un servicio tipo gist), reintroducir; no es prioridad MVP.

### 2.4 `last sync 2m` en el footer del sidebar
Reemplazar por un texto que refleje el modelo real:
- Default (sin IndexedDB toggle): `En memoria · refresh borra todo`.
- Con IndexedDB toggle ON: `Guardado en este navegador · <relative time>`.

### 2.5 `Auto-save · 2s ago` en el statusbar
**Mantener,** pero el tooltip dice: *"Cambios guardados en memoria de la pestaña. Si activás 'Recordar este proyecto' en Settings, también se guardan en este navegador."*

### 2.6 Drop zone
Mockup: `Drop .tex, .bib, images here / or paste an Overleaf project URL`.
Real: `Drop .tex, .bib, images here / or paste a .zip` (sin Overleaf import — sería un endpoint de scraping que aumenta scope y riesgo de TOS).

### 2.7 `Search` en topbar
**Mantener.** Implementación cliente puro: `Cmd+F` global hace fuzzy search sobre los `path`s de `files`, y opcionalmente full-text sobre `content` de los `.tex/.bib`. No requiere backend.

---

## 3. Conexión a la arquitectura real

### 3.1 Editor: del mockup a CodeMirror 6
El mockup tokeniza línea por línea con `tokenizeLatex` propio y muestra `<span class="tk-cmd">…</span>`. Eso se descarta — usamos CodeMirror 6:

- Extensión `@codemirror/legacy-modes/mode/stex` para LaTeX.
- Theme custom (`packages/web/src/editor/theme.ts`) que mapea los tokens del modo a las custom properties `--tk-*` del diseño.
- Line numbers via `lineNumbers()` extension, controlables por el toggle `showLineNumbers` del Tweaks panel.
- Minimap: hay extensiones community (`@replit/codemirror-minimap` o similar) — evaluar tamaño. Si suma > 30KB, **omitir minimap del MVP**; el diseño se puede ajustar sin él. Decisión final en Fase 3 al implementar.
- Cursor position (`Ln X, Col Y` en la `pane-head-right`) se lee del `selectionState` de CodeMirror.

### 3.2 PDF preview: del mockup a pdfjs-dist
El mockup usa KaTeX para renderizar matemáticas y simular el PDF. En real:
- Recibimos un `Blob` (PDF) de `POST /api/compile`.
- `pdfjs-dist` lo abre, lo paginá, lo rendea en canvases.
- Zoom controls del mockup se conectan a `pdfjs` scale.
- Paginación (`1 / 4`) del mockup se conecta a `pdf.numPages` y a un scroll-spy.
- "Compiled in 1.42s" se calcula con `performance.now()` cliente, o se lee del response del API si lo agregamos al header.

### 3.3 Status bar y log parser
El mockup ya muestra el formato (`OK`, `WARN`, `LOG` con tags coloreados). El parser de logs LaTeX produce:

```ts
type LogLine =
  | { kind: 'ok'; message: string }
  | { kind: 'warn'; message: string; line?: number; file?: string }
  | { kind: 'error'; message: string; line?: number; file?: string }
  | { kind: 'info'; message: string };
```

Implementación en `packages/shared/src/log-parser.ts`. El statusbar muestra las últimas 3 líneas; un click expande un panel inferior con todo el log.

### 3.4 Tweaks panel → Settings (preferencias UI)
Las preferencias del Tweaks panel **sí** son OK persistirlas en `localStorage` — son configuración del navegador, no contenido del proyecto. Diferencia importante respecto a ADR-013:
- Contenido del proyecto (archivos del usuario) → memoria pura, opcionalmente IndexedDB con toggle off por default.
- Preferencias UI (tema, acento, fuente, etc.) → `localStorage` directo, siempre persistente. Es estado del navegador, no datos del usuario.

Tweaks panel se renombra **Settings**, abre desde el botón de engranaje del topbar (que reemplaza al avatar).

### 3.5 Drop zone funcional
- Acepta drag-and-drop de archivos individuales (`.tex`, `.bib`, imágenes) → agregar al store.
- Acepta drag-and-drop de un `.zip` → descomprimir con `fflate` → reemplazar el store.
- Acepta paste de un `.zip` desde clipboard (raro, low priority).

---

## 4. Fonts y assets

- Fuentes en producción: servidas localmente desde `apps/web/public/fonts/` o vía un service como Fontsource (`@fontsource-variable/inter`, etc.) — **no** Google Fonts en runtime (cero requests externos preserva la propuesta de privacidad).
- Iconos: el mockup usa SVGs inline minimalistas. Portarlos como componentes React en `apps/web/src/icons/` o usar `lucide-react` (más opciones, pesa ~3KB por icono usado con tree-shaking). Decisión: **`lucide-react`** salvo que el diseño tenga iconos custom que lucide no tenga (verificar al implementar).

---

## 5. Cambios menores al roadmap

La Fase 3 ("UX y diseño") se concretiza ahora con tareas alineadas al diseño:

1. Portar `tokens.css` y aplicar `data-theme="dark"` por default.
2. Implementar `TopBar` con los ajustes de §2 (sin avatar, sin share, breadcrumbs simplificados, botón Settings).
3. Implementar `Sidebar` con file tree real conectado al store, drop zone funcional, tabs Project/Outline.
4. Outline: parser de `\section{}`, `\subsection{}`, etc., desde el .tex activo.
5. Editor con CodeMirror 6 + theme custom que matchea los tokens del mockup.
6. Editor toolbar funcional: cada botón inserta snippets en CodeMirror.
7. Preview con pdfjs-dist + controles de zoom/paginación del diseño.
8. Status bar con parser de logs.
9. Settings panel (renombrado del Tweaks) con persistencia en `localStorage` para preferencias UI.
10. Validar accesibilidad y nav por teclado.

---

## 6. Lo que no se usa del diseño

- `index.html` del mockup: solo referencia. La versión real es la generada por Vite.
- KaTeX en `index.html`: se elimina.
- React/Babel desde unpkg: se reemplaza por el bundler real.
- `document.jsx` con `PAPER_TITLE`, `LATEX_SOURCE`, `PROJECT_TREE`, `OUTLINE` hardcoded: solo sirve como ejemplo para tests; en runtime esos datos vienen del store cargado por el usuario.

---

## 7. Acción inmediata (cuando arranque Fase 0)

No es necesario tocar el diseño en Fase 0 (solo scaffolding). Pero al levantar `apps/web` con `pnpm create vite`, **primer commit visual**: copiar `design/styles.css` a `apps/web/src/styles/tokens.css` (solo la sección `:root` y `:root[data-theme="light"]` + reset básico). Eso instala la paleta y las fuentes desde el día uno; los componentes vienen en Fase 1 y 3.
