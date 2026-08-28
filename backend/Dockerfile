# =============================================================================
# Digital Lending OS - Backend Dockerfile
# Express.js API Server with Alpine Linux
# Multi-stage build: dependencies -> build -> production
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install all dependencies (including devDependencies for build)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Copy dependency files
COPY package.json ./

# Install all dependencies (including dev for TypeScript compilation)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build
# Compile TypeScript to JavaScript
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# Minimal image with only production artifacts
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install required packages
RUN apk add --no-cache \
    # For health checks
    curl \
    # Prisma CLI might need this
    openssl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Copy package.json for potential scripts
COPY --chown=backend:nodejs package.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled source from builder
COPY --from=builder --chown=backend:nodejs /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=builder --chown=backend:nodejs /app/prisma ./prisma
COPY --from=builder --chown=backend:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=backend:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads directory for file storage
RUN mkdir -p uploads && chown -R backend:nodejs uploads

# Switch to non-root user
USER backend

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Start the API server
CMD ["node", "dist/index.js"]
