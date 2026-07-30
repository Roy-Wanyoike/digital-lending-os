# ─────────────────────────────────────────────────────────────────────
# Youngsend — Production Multi-Stage Dockerfile
# Target: <200 MB final image (standalone Next.js 16)
# ─────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./

# Install ALL deps (including devDependencies) — needed for the build step.
# Using npm ci for reproducible installs; falls back to npm install when no lockfile.
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f bun.lock ]; then corepack enable bun && bun install --frozen-lockfile; \
  else npm install; \
  fi

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build
RUN npx prisma generate

# Build Next.js in standalone mode (set in next.config.ts)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Copy standalone output from build stage
COPY --from=builder /app/.next/standalone ./

# Copy static & public assets (standalone does not bundle these)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma engine for runtime database access
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Ensure the nextjs user owns the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Health check — hit the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
