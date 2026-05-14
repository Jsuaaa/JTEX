# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1 — install deps once (shared across web-build and api-build)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile || pnpm install

# =============================================================================
# Stage 2 — build the web SPA (static assets)
# =============================================================================
FROM deps AS web-build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @jtex/web build

# =============================================================================
# Stage 3 — build the API (bundled with tsup) and deploy with prod node_modules
# =============================================================================
FROM deps AS api-build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @jtex/api build
# pnpm deploy creates a self-contained directory with package.json, node_modules
# (prod-only, no symlinks) and the package source/dist. Result is portable into
# the runtime image without dragging the full pnpm store.
RUN pnpm --filter @jtex/api --prod --legacy deploy /deploy

# =============================================================================
# Stage 4 — runtime image: Node + Tectonic + TeX Live (subset) + the SPA
# =============================================================================
FROM debian:bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
ARG TECTONIC_VERSION=0.15.0

# System deps + TeX Live (fallback engines) + Node 20.
# tectonic is NOT in bookworm apt — we install it from the official GitHub release below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg xz-utils fontconfig dumb-init \
        texlive-latex-base texlive-latex-recommended \
        texlive-fonts-recommended texlive-fonts-extra \
        texlive-latex-extra texlive-bibtex-extra \
        texlive-plain-generic \
        texlive-lang-spanish texlive-lang-english \
        texlive-science texlive-pictures \
        texlive-xetex texlive-luatex \
        biber latexmk \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install tectonic as a static binary from the official release.
# Supports both amd64 (most VPS) and arm64 (Apple Silicon dev).
RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
        amd64) TECTONIC_ARCH="x86_64-unknown-linux-musl" ;; \
        arm64) TECTONIC_ARCH="aarch64-unknown-linux-musl" ;; \
        *) echo "Unsupported arch: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_ARCH}.tar.gz" \
        -o /tmp/tectonic.tar.gz; \
    tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin tectonic; \
    rm /tmp/tectonic.tar.gz; \
    chmod +x /usr/local/bin/tectonic; \
    tectonic --version

# Pre-warm tectonic cache so the first user request doesn't pay the package download cost.
COPY infra/docker/warmup.tex /tmp/warmup/warmup.tex
RUN cd /tmp/warmup && (tectonic warmup.tex || true) && rm -rf /tmp/warmup

# Non-root user
RUN useradd --system --create-home --shell /usr/sbin/nologin app

# App layout
WORKDIR /app
COPY --from=api-build /deploy /app
COPY --from=web-build /repo/apps/web/dist /app/public

RUN mkdir -p /tmp/jtex-jobs /var/cache/tectonic \
    && chown -R app:app /app /tmp/jtex-jobs /var/cache/tectonic

USER app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    JOBS_DIR=/tmp/jtex-jobs \
    PUBLIC_DIR=/app/public \
    SERVE_PUBLIC=true \
    MAX_CONCURRENT_COMPILES=2 \
    COMPILE_TIMEOUT_MS=60000 \
    MAX_PROJECT_BYTES=52428800 \
    TECTONIC_CACHE_DIR=/var/cache/tectonic

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "/app/dist/server.js"]
