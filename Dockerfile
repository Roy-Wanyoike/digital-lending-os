# =============================================================================
# Digital Lending OS - Frontend Dockerfile (Multi-stage Build)
# =============================================================================
# Next.js 16 Application with Alpine Linux for minimal image size
# Supports both development and production deployments
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install dependencies first to leverage Docker layer caching
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies using npm ci for reproducible builds
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build
# Compile the Next.js application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
# Note: next.config.ts has output: "standalone" enabled
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# Minimal image with only production artifacts
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install security updates and required packages
RUN apk add --no-cache \
    # For sharp (image processing) native modules
    vips-dev \
    # For health checks
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema and client (if needed for server-side DB access)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
