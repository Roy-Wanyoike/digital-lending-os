# Digital Lending OS - Docker Deployment Guide

Complete guide for containerizing and deploying the Digital Lending OS using Docker.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Development Mode](#development-mode)
6. [Production Deployment](#production-deployment)
7. [Scaling Considerations](#scaling-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Development (with hot reload)

```bash
# 1. Clone the repository
git clone <repository-url>
cd digital-lending-os

# 2. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Edit .env files with your configuration
nano .env
nano backend/.env

# 4. Start all services in development mode
docker compose up -d

# 5. View logs
docker compose logs -f

# 6. Access applications
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
```

### Production Build

```bash
# 1. Set production environment variables
export NODE_ENV=production
export DOMAIN=your-domain.com
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# 2. Build and start production containers
docker compose -f docker-compose.yml up -d --build

# 3. Check service health
docker compose ps
docker compose logs --tail=50
```

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | >= 24.0 | Container runtime |
| Docker Compose | >= 2.20 | Multi-container orchestration |
| Git | Latest | Version control |

### System Resources

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB+ |
| CPU | 2 cores | 4 cores+ |
| Disk | 10 GB free | 20 GB+ |

### Port Requirements

| Service | Default Port | Configurable |
|---------|--------------|--------------|
| Frontend (Next.js) | 3000 | `FRONTEND_PORT` |
| Backend API (Express) | 4000 | `BACKEND_PORT` |
| PostgreSQL Database | 5432 | `DB_PORT` |
| Redis Cache | 6379 | `REDIS_PORT` |

---

## Project Structure

```
digital-lending-os/
├── Dockerfile                  # Frontend multi-stage build
├── docker-compose.yml          # Production orchestration
├── docker-compose.override.yml # Development overrides
├── .dockerignore               # Frontend build exclusions
├── backend/
│   ├── Dockerfile              # Backend multi-stage build
│   └── .dockerignore           # Backend build exclusions
├── prisma/
│   └── schema.prisma           # Database schema
└── src/                        # Frontend source code
```

### Docker Image Architecture

#### Frontend (Next.js)

```
Stage 1: deps        → Install npm dependencies
Stage 2: builder     → Compile Next.js application
Stage 3: runner      → Production-ready minimal image
```

**Final image includes:**
- Node.js 20 Alpine runtime
- Compiled `.next/standalone` output
- Static assets (`public/`, `.next/static`)
- Prisma client for server-side DB access

**Image size:** ~180MB (compressed: ~60MB)

#### Backend (Express.js)

```
Stage 1: deps        → Install all dependencies
Stage 2: builder     → Generate Prisma client, compile TypeScript
Stage 3: runner      → Production-ready minimal image
```

**Final image includes:**
- Node.js 20 Alpine runtime
- Compiled JavaScript (`dist/`)
- Prisma schema and generated client

**Image size:** ~150MB (compressed: ~50MB)

---

## Environment Variables

### Required for Production

Create a `.env` file in the project root:

```bash
# =============================================================================
# Domain Configuration
# =============================================================================
DOMAIN=your-domain.com

# =============================================================================
# Database (PostgreSQL)
# =============================================================================
POSTGRES_USER=dlos_user
POSTGRES_PASSWORD=change_me_to_secure_random_string
POSTGRES_DB=digital_lending_os
DB_PORT=5432

# =============================================================================
# Authentication Secrets (GENERATE SECURE VALUES!)
# =============================================================================
JWT_SECRET=$(openssl rand -base64 64)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)

# =============================================================================
# M-PESA Integration (Safaricom Daraja API)
# =============================================================================
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_paybill_number
MPESA_ENVIRONMENT=production

# =============================================================================
# Application Ports
# =============================================================================
FRONTEND_PORT=3000
BACKEND_PORT=4000
REDIS_PORT=6379

# =============================================================================
# Logging
# =============================================================================
LOG_LEVEL=info  # debug|info|warn|error
```

### Backend-Specific Variables

Create `backend/.env`:

```bash
# Server
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database (PostgreSQL format for Prisma)
DATABASE_URL=postgresql://dlos_user:password@db:5432/digital_lending_os?schema=public

# Redis
REDIS_URL=redis://redis:6379

# CORS (comma-separated origins)
CORS_ORIGINS=https://your-domain.com

# JWT
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
COOKIE_SECRET=your_cookie_secret_minimum_32_characters

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Secret Generation Commands

```bash
# Generate secure secrets
openssl rand -base64 64 > /tmp/jwt_secret.txt
openssl rand -base64 32 > /tmp/postgres_password.txt
openssl rand -base64 32 > /tmp/cookie_secret.txt

# View generated secrets
cat /tmp/jwt_secret.txt
cat /tmp/postgres_password.txt
cat /tmp/cookie_secret.txt
```

---

## Development Mode

The `docker-compose.override.yml` provides development-specific configurations:

### Features

- **SQLite database** instead of PostgreSQL (simpler setup)
- **Hot module replacement** for frontend (Next.js dev server)
- **TypeScript watch mode** for backend (tsx with auto-restart)
- **Source code mounting** for live updates
- **Debug logging** enabled by default
- **Relaxed CORS** for local development

### Starting Development Environment

```bash
# With override (default behavior)
docker compose up -d

# Or explicitly
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Watch logs in real-time
docker compose logs -f backend
docker compose logs -f frontend
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker compose up -d --build backend

# Rebuild all services
docker compose up -d --build

# Force rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Accessing Services in Dev Mode

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js with HMR |
| Backend API | http://localhost:4000/api/v1 | Express REST API |
| Prisma Studio | Run locally: `npx prisma studio` | Database browser |

---

## Production Deployment

### Option 1: Direct Docker Compose (Single Server)

```bash
# 1. Prepare environment
cp .env.example .env
# Edit .env with production values

# 2. Build images
docker compose -f docker-compose.yml build

# 3. Start services
docker compose -f docker-compose.yml up -d

# 4. Initialize database
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy

# 5. Verify health
curl http://localhost:3000/api/health
curl http://localhost:4000/api/v1/health
```

### Option 2: Docker Swarm (Multi-Node Cluster)

```bash
# Initialize swarm (if not already)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml lending-os

# Check status
docker stack services lending-os
docker stack ps lending-os
```

### Option 3: Kubernetes

See `k8s/` directory (if available) or convert using:

```bash
# Convert docker-compose to Kubernetes manifests
kompose convert -f docker-compose.yml -o k8s/
```

### Reverse Proxy Configuration

#### Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for long-running requests
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

#### Caddy (Automatic HTTPS)

```
your-domain.com {
    reverse_proxy / frontend:3000
    reverse_proxy /api/* backend:4000
    
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

### SSL/TLS Certificates

Using Let's Encrypt with Certbot:

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (usually configured automatically)
certbot renew --dry-run
```

### Database Migrations

```bash
# Run migrations on production database
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy

# Create new migration (during development)
docker compose exec backend npx prisma migrate dev --name migration_name

# Reset database (DESTRUCTIVE - only for dev!)
docker compose exec backend npx prisma migrate reset
```

### Backups

#### PostgreSQL Backup

```bash
# Create backup
docker compose -f docker-compose.yml exec db pg_dump -U dlos_user digital_lending_os > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20240101.sql | docker compose -i -T db psql -U dlos_user digital_lending_os

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
mkdir -p $BACKUP_DIR
docker compose exec -T db pg_dump -U dlos_user digital_lending_os | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
# Keep last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

---

## Scaling Considerations

### Horizontal Scaling

#### Stateless Design

Both frontend and backend are designed to be stateless:

- **Sessions**: JWT tokens stored in HTTP-only cookies
- **Cache**: External Redis instance
- **Files**: Object storage (S3-compatible) recommended for production

#### Scaling Frontend

```yaml
# In docker-compose.yml, modify frontend service:
frontend:
  deploy:
    replicas: 3  # Run 3 instances
    resources:
      limits:
        memory: 512M
```

#### Scaling Backend

```yaml
backend:
  deploy:
    replicas: 3  # Run 3 instances
```

**Important:** Use a load balancer (Nginx, HAProxy, AWS ALB) to distribute traffic.

### Vertical Scaling

Adjust resource limits based on load:

```yaml
backend:
  deploy:
    resources:
      limits:
        memory: 1G      # Increase from 512M
        cpus: "2.0"     # Increase from 1.0
```

### Database Scaling

#### Read Replicas (PostgreSQL)

```yaml
db-primary:
  image: postgres:16-alpine
  environment:
    POSTGRES_REPLICATION_MODE: master

db-replica:
  image: postgres:16-alpine
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: db-primary
    POSTGRES_REPLICATION_USER: replicator
```

#### Connection Pooling (PgBouncer)

```yaml
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DATABASE_URL: postgres://dlos_user:password@db:5432/digital_lending_os
    POOL_MODE: transaction
    DEFAULT_POOL_SIZE: 25
  ports:
    - "6432:6432"
```

### Redis Scaling

For high-throughput scenarios:

1. **Redis Cluster**: For datasets larger than memory
2. **Redis Sentinel**: For high availability
3. **External Redis Service**: AWS ElastiCache, Redis Labs

### Monitoring & Observability

#### Health Checks

All services include built-in health checks:

```bash
# Check all service health
docker compose ps

# Individual health checks
curl http://localhost:3000/api/health
curl http://localhost:4000/api/v1/health
docker compose exec redis redis-cli ping
docker compose exec db pg_isready -U dlos_user
```

#### Log Aggregation

```bash
# View all logs
docker compose logs -f

# Filter by service
docker compose logs -f backend
docker compose logs -f frontend

# Export logs
docker compose logs > app_$(date +%Y%m%d).log
```

Recommended tools:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki + Grafana**: Lightweight alternative
- **CloudWatch Logs**: AWS integration

#### Metrics Collection

Consider adding:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Datadog/New Relic**: APM solutions

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :4000

# Kill process or change port in .env
FRONTEND_PORT=3001
BACKEND_PORT=4001
```

#### 2. Database Connection Failed

```bash
# Check if database is healthy
docker compose ps db

# Check database logs
docker compose logs db

# Test connection manually
docker compose exec db psql -U dlos_user -d digital_lending_os -c "SELECT 1"
```

#### 3. Migration Errors

```bash
# Reset migrations (dev only!)
docker compose exec backend npx prisma migrate reset --force

# Check migration status
docker compose exec backend npx prisma migrate status
```

#### 4. Out of Memory

```bash
# Check resource usage
docker stats

# Adjust limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

#### 5. Permission Denied (uploads)

```bash
# Fix upload directory permissions
docker compose exec backend chown -R nodejs:nodejs uploads
```

### Debugging Commands

```bash
# Shell into running container
docker compose exec backend sh
docker compose exec frontend sh

# Restart single service
docker compose restart backend

# Rebuild and restart
docker compose up -d --build backend

# View container details
docker inspect dlos-backend

# Follow real-time logs
docker compose logs -f --tail=100 backend
```

### Cleanup

```bash
# Stop and remove containers
docker compose down

# Remove volumes (DESTRUCTIVE - deletes data!)
docker compose down -v

# Remove orphaned images
docker image prune -a

# Full reset (development only)
docker compose down -v --rmi all
```

---

## Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Use strong random values for JWT secrets
- [ ] Enable HTTPS in production
- [ ] Set `SESSION_SECURE_COOKIE=true`
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Regular security updates: `docker compose pull && docker compose up -d`
- [ ] Network isolation: services on internal network only
- [ ] Non-root user in containers (configured by default)
- [ ] Resource limits to prevent DoS
- [ ] Regular backups configured
- [ ] Audit logging enabled

---

## Support

For issues or questions:

1. Check this documentation
2. Review `docs/ARCHITECTURE.md` for system design
3. Check GitHub Issues for known problems
4. Contact: support@digitallendingos.com

---

*Last Updated: January 2026*
*Version: 1.0.0*
