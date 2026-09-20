# =============================================================
# LegalTech Frontend — Production Dockerfile
# =============================================================
# Two-stage build:
#   Stage 1 (builder): Installs deps, builds Next.js static output
#   Stage 2 (serve):   Nginx serves the static files
#
# NEXT_PUBLIC_API_URL is injected at build time via --build-arg.
# =============================================================

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Accept the API URL as a build argument (baked into the static JS bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Install dependencies first (separate layer for better caching)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source code and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Node.js ──────────────────────────────
FROM node:22-alpine AS serve

WORKDIR /app

# Only need the production env file and public directory statically
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose HTTP port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
