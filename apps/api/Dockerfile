# ====================================================================
# SoulSync 2.0 — NestJS Core API Gateway Dockerfile
# Multi-stage production build (Node.js 22 Debian slim)
# Context: Monorepo root (.)
# ====================================================================

# --------------------------------------------------------------------
# Stage 1: Base runtime environment with pnpm and system libraries
# --------------------------------------------------------------------
FROM node:22-slim AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable pnpm matching monorepo packageManager spec (pnpm@10.5.2)
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Install OpenSSL (required by Prisma engine binaries on Debian) & CA certificates
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# --------------------------------------------------------------------
# Stage 2: Dependencies, code generation, and compilation
# --------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# 1. Copy workspace manifests to maximize layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# 2. Install all dependencies (including devDependencies required for compilation)
RUN pnpm install --frozen-lockfile

# 3. Copy source files for shared packages and API application
COPY packages/contracts ./packages/contracts
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# 4. Generate Prisma Client (builds engine binaries & typings into node_modules)
RUN pnpm --filter @soulsync/database db:generate

# 5. Compile shared contracts package (tsc -> packages/contracts/dist)
RUN pnpm --filter @soulsync/contracts build

# 6. Compile NestJS API application (nest build -> apps/api/dist)
RUN pnpm --filter @soulsync/api build

# 7. Prune devDependencies to keep only production dependencies
RUN pnpm prune --prod

# --------------------------------------------------------------------
# Stage 3: Minimal, secure production runner
# --------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install OpenSSL for Prisma runtime database connectivity
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Run as non-root user (security best practice)
USER node

# Copy pruned production node_modules, compiled packages, and application dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/apps/api

EXPOSE 4000

# Liveness probe calling the unauthenticated health endpoint with robust error handling
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const req = require('http').get('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/v1/healthz', (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1));"

CMD ["node", "dist/main.js"]
