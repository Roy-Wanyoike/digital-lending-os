# ADR-010: Threat Model - Infrastructure & Reliability

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Unauthorized pod access via kubectl | Low | Critical | RBAC restricts kubectl to platform team; pods run as non-root (nextjs:1001) | Low |
| Impersonate a Kubernetes service account | Low | Critical | RBAC least-privilege; service account tokens auto-rotated; no cluster-admin for app pods | Very Low |
| SSH access to worker nodes | Low | Critical | GKE private cluster; no public SSH; bastion host with MFA for ops team | Very Low |
| Spoofed Docker registry (supply chain) | Low | Critical | Private container registry (GCR/Artifact Registry); image pull over TLS; image digest pinning | Low |
| Spoofed GitHub Actions runner | Low | High | GitHub-hosted runners with OIDC; minimal secrets in CI; no self-hosted runners | Low |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Container image tampering | Low | Critical | Multi-stage build; final image is minimal alpine; no shell in runner stage; image digest pinning | Low |
| Dependency tampering (npm packages) | Medium | Critical | `npm audit` in CI; lockfile integrity; Dependabot alerts; periodic manual review | Medium |
| Environment variable tampering at runtime | Low | Critical | K8s Secrets with encryption at rest; `env.ts` validates via Zod at startup; no secrets in code | Low |
| Dockerfile tampering in repo | Low | High | CODEOWNERS on Dockerfile; PR review required; CI rebuilds from source | Very Low |
| next.config.ts tampering | Low | High | `ignoreBuildErrors: false` + `reactStrictMode: true` are verified in CI build step | Very Low |
| Kubernetes manifest tampering | Low | Critical | GitOps (ArgoCD/Flux) applies manifests from committed code; no manual kubectl apply | Low |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Deny deploying a vulnerable image | Low | Medium | CI pipeline logs all build artifacts with SHA; ArgoCD records all deployments | Low |
| Deny modifying infrastructure | Low | High | Git history records all manifest changes; K8s audit logs record all API calls | Low |
| Deny container crash was caused by misconfiguration | Medium | Low | Container logs + structured JSON logging + Prometheus metrics provide evidence | Low |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Secret leakage in CI logs | Medium | High | GitHub Actions masks registered secrets; `***` in log output; no echo of secrets | Low |
| Secret leakage in container image | Low | Critical | Secrets injected via K8s env vars at runtime; not baked into image; `.dockerignore` excludes `.env` | Very Low |
| Secret leakage in Next.js client bundle | Low | Critical | Server-only env vars (`NEXTAUTH_SECRET`, `DATABASE_URL`) never in client JS; `NEXT_PUBLIC_` prefix required | Very Low |
| `X-Powered-By` header | Inherent | Low | `poweredByHeader: false` in next.config.ts removes it | Very Low |
| `.env.example` leaks real values | Low | Medium | `.env.example` contains safe defaults only; real `.env` in `.gitignore` | Very Low |
| Docker image layer exposure | Low | Low | Multi-stage build: only standalone output in final layer; no source code or .env | Very Low |
| K8s API server exposure | Low | Critical | Private cluster; API server not accessible from public internet; authorized networks only | Very Low |
| Pod logs contain sensitive data | Medium | Medium | Structured logger doesn't log request bodies; tokens not logged on auth errors | Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| DDoS on application pods | High | High | Cloudflare WAF + DDoS protection at edge; rate limiting; geo-blocking | Medium |
| Resource exhaustion (pod OOM) | Medium | Medium | K8s resource limits (CPU/memory); HPA scales on 70% CPU; OOMKill triggers pod restart | Low |
| Node failure (hardware) | Medium | Medium | GKE managed node pools; auto-repair replaces unhealthy nodes; 3+ node minimum | Low |
| etcd overload | Low | High | GKE manages etcd; no custom etcd access; resource limits on control plane | Very Low |
| CI pipeline abuse (unlimited PRs) | Low | Low | Concurrency limit on GitHub Actions; branch protection rules | Very Low |
| Image registry unavailability | Low | Medium | GCR is multi-region; images cached on GKE nodes after first pull | Low |
| Disk pressure on Kafka/PostgreSQL nodes | Medium | High | Persistent volumes with monitoring; disk usage alerting at 80%; log rotation | Medium |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Container escape to host | Very Low | Critical | GKE Shielded GKE nodes; gVisor sandboxing (optional); non-root container (UID 1001) | Very Low |
| Privilege escalation via vulnerable base image | Low | Critical | `node:20-alpine` official image; base image pinned to digest; Trivy scan in CI (future) | Low |
| K8s API server compromise | Very Low | Critical | Private cluster; RBAC; no cluster-admin for app teams; audit logging | Very Low |
| CI pipeline privilege escalation | Low | High | Minimal GITHUB_TOKEN scope; no self-hosted runners; OIDC for cloud auth | Low |
| `.dockerignore` bypass (secrets in image) | Low | High | `.dockerignore` excludes `.env`, `*.key`, `*.pem`; CI verifies no secrets in layers | Low |

---

## Attack Trees

### Attack Tree 1: Container Escape

```
Container Escape
+-- 1.1 Kernel vulnerability (CVE in host kernel)
|   +-- Mitigated: GKE auto-patches nodes; GKE Shielded nodes verify boot integrity
|   +-- Mitigated: gVisor sandbox (optional) provides userspace kernel
+-- 1.2 Privileged container with host mount
|   +-- Mitigated: No privileged containers; securityContext: runAsNonRoot, readOnlyRootFilesystem
|   +-- Mitigated: GKE pod security standards enforce non-privileged pods
+-- 1.3 Volume mount to host filesystem
    +-- Mitigated: No hostPath volumes; only PersistentVolumeClaims and emptyDir
    +-- Mitigated: GKE node pools prevent hostPath mounts via PodSecurityPolicy
```

### Attack Tree 2: Supply Chain (Image Tampering)

```
Supply Chain Attack
+-- 2.1 Compromised npm package
|   +-- Mitigated: npm audit in CI
|   +-- Mitigated: package-lock.json ensures deterministic builds
|   +-- Risk: Zero-day in transitive dependency
|       +-- Mitigated: Dependabot alerts; manual review for critical
+-- 2.2 Compromised base image (node:20-alpine)
|   +-- Mitigated: Official Docker Hub image; pinned to digest
|   +-- Mitigated: Multi-stage build reduces attack surface (runner has no build tools)
+-- 2.3 Tampered image in registry
|   +-- Mitigated: Private GCR with IAM auth; image pull requires service account
|   +-- Mitigated: Image digest pinning in Kubernetes manifests
+-- 2.4 CI/CD pipeline compromise
    +-- Mitigated: GitHub-hosted runners (no self-hosted runner risk)
    +-- Mitigated: OIDC for cloud auth (no long-lived secrets)
    +-- Mitigated: Branch protection requires review
```

### Attack Tree 3: Secret Leakage

```
Secret Leakage
+-- 3.1 Secrets in CI logs
|   +-- Mitigated: GitHub Actions masks registered secrets
|   +-- Mitigated: Zod env validation fails on missing secrets (app won't start without them)
+-- 3.2 Secrets in Docker image
|   +-- Mitigated: Secrets injected at runtime via K8s env vars
|   +-- Mitigated: .dockerignore excludes .env, *.key, *.pem
|   +-- Mitigated: Multi-stage build: secrets only exist in builder stage (not in final image)
+-- 3.3 Secrets in client bundle
|   +-- Mitigated: NEXT_PUBLIC_ prefix required for client exposure
|   +-- Mitigated: No NEXT_PUBLIC_ vars for secrets
+-- 3.4 K8s Secret access by unauthorized pod
    +-- Mitigated: RBAC restricts which pods can access which secrets
    +-- Mitigated: App pods only receive their own secrets via env vars
    +-- Mitigated: K8s Secret encryption at rest (GKE default)
```

### Attack Tree 4: DDoS

```
DDoS Attack
+-- 4.1 Volumetric DDoS (bandwidth flood)
|   +-- Mitigated: Cloudflare Anycast network absorbs volumetric attacks
|   +-- Mitigated: Cloudflare DDoS auto-mitigation
+-- 4.2 Application-layer DDoS (HTTP flood)
|   +-- Mitigated: Cloudflare WAF blocks bot traffic
|   +-- Mitigated: Edge rate limiting (KV sliding window)
|   +-- Mitigated: HPA scales pods to handle legitimate traffic surge
+-- 4.3 Slowloris (connection exhaustion)
|   +-- Mitigated: Cloudflare terminates connections; origin sees only completed requests
|   +-- Mitigated: Connection timeouts on GKE Ingress
+-- 4.4 Cache invalidation DDoS
    +-- Mitigated: Cache keys include auth identity; attacker cannot invalidate others' cache
    +-- Mitigated: Rate limiting on mutation endpoints
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------|----------|
| Container escape | VERY LOW | gVisor optional; non-root + GKE Shielded nodes |
| Supply chain (npm) | MEDIUM | No runtime integrity check; relies on CI npm audit |
| Supply chain (base image) | LOW | Official image + digest pinning |
| Secret leakage | LOW | Multi-layer defense (CI masking, K8s secrets, env var injection) |
| DDoS | MEDIUM | Cloudflare absorbs most; HPA handles organic traffic surge |
| K8s API exposure | VERY LOW | Private cluster; RBAC; audit logging |
| CI pipeline abuse | LOW | Concurrency limits + branch protection |

**Top priority:** Add Trivy container image scanning to CI pipeline to detect known vulnerabilities in base image and dependencies before deployment.
