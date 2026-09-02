# ─────────────────────────────────────────────────────────────────────
# Youngsend — Production Multi-Stage Dockerfile
# Node 22 · Alpine · Non-root · Standalone output
# ─────────────────────────────────────────────────────────────────────

# ── Stage 1: deps — Production dependencies ──────────────────────────
FROM node:22-alpine AS deps

# libc compat for Prisma query engine (Alpine uses musl)
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: builder — Full install + build ──────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy Prisma schema so prisma generate can run before full source copy
COPY prisma/ ./prisma/

COPY package.json package-lock.json ./
RUN npm ci

RUN npx prisma generate

# Copy remaining source
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runner — Minimal production image ───────────────────────
FROM node:22-alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy standalone output (includes server.js + traced dependencies)
COPY --from=builder /app/.next/standalone ./

# Static assets and public directory (not included in standalone)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma — schema for runtime migrations, generated client + engine
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

# Security: run as non-root
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node", "server.js"]
