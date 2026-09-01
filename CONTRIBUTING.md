# Contributing to Digital Lending OS

Thank you for your interest in contributing to **Digital Lending OS** - a multi-tenant SaaS platform for Digital Credit Providers (DCPs).

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)

## Code of Conduct

This project adheres to professional standards:
- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize security and data privacy (especially for financial systems)
- Follow Kenyan/East African regulatory considerations for lending platforms

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm or bun
- SQLite (development) / PostgreSQL (production)
- Docker (optional, for containerized deployment)

### Setup

```bash
# Clone the repository
git clone https://github.com/Roy-Wanyoike/digital-lending-os.git
cd digital-lending-os

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Setup database
npx prisma migrate dev

# Start development servers
npm run dev        # Frontend on :3000
cd backend && npm run dev  # Backend on :4000
```

## Development Workflow

### Branch Strategy

We use a **branch-based workflow** with PRs:

```
main (protected)
  ├── feature/feature-name     # New features
  ├── fix/bug-description      # Bug fixes  
  ├── docs/documentation       # Documentation updates
  ├── refactor/code-improvement # Refactoring
  └── hotfix/urgent-fix        # Production hotfixes
```

### Creating a Feature Branch

```bash
# Always start from updated main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Write clean, tested code
2. Follow existing code style
3. Update documentation if needed
4. Test your changes locally

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated (target >80% coverage)
- [ ] No console.log or debugging code left
- [ ] Security review for sensitive data handling

### PR Title Format

Use conventional commits:

| Type | Description | Example |
|------|-------------|---------|
| `feat:` | New feature | `feat: add loan disbursement workflow` |
| `fix:` | Bug fix | `fix: resolve M-Pesa callback timeout` |
| `docs:` | Documentation | `docs: API authentication guide` |
| `refactor:` | Code restructuring | `refactor: simplify payment service` |
| `test:` | Adding tests | `test: add controller unit tests` |
| `chore:` | Maintenance | `chore: update dependencies` |

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add UI screenshots for frontend changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] Added tests
- [ ] No new warnings
- [ ] Security reviewed
```

### PR Review Process

1. **Automated checks** must pass (CI/CD, lint, tests)
2. **Code owner** approval required (see CODEOWNERS)
3. **Minimum 1 approval** for merge
4. **No pending changes** requested

### Merging

- Squash and merge for clean history
- Main branch is protected
- Hotfixes can be fast-forwarded with maintainer approval

## Coding Standards

### TypeScript/JavaScript

- Use strict TypeScript mode
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw promises
- Implement proper error handling

### Security Requirements (Critical for Fintech)

```typescript
// ✅ DO: Validate all inputs
import { z } from 'zod';
const LoanSchema = z.object({
  amount: z.number().positive().max(1000000),
});

// ✅ DO: Use parameterized queries
prisma.loan.findMany({ where: { customerId } });

// ❌ DON'T: Never interpolate user input
prisma.$queryRawUnsafe(`SELECT * FROM loans WHERE id = ${userId}`);
```

### Frontend (Next.js + React)

- Use functional components with hooks
- Follow existing component patterns in `/src/components`
- Use shadcn/ui components from `/src/components/ui`
- Implement proper loading/error states

### Backend (Express.js)

- Use controllers/services pattern
- Implement request validation with Zod
- Return standardized API responses
- Log appropriately (no sensitive data)

## Commit Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Example

```
feat(loan): add loan approval workflow

Implement multi-step approval process for loan amounts >100K KES:
- Add approval tiers based on amount
- Email notifications to approvers
- Audit trail for all decisions

Closes #123
```

## Testing Strategy

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# API integration tests
npm run test:integration
```

### E2E Tests (Planned)

```bash
# End-to-end tests (coming soon)
npm run test:e2e
```

## Areas Needing Contributions

We especially need help with:

1. **Core Features**
   - [ ] Advanced loan calculation engines
   - [ ] Credit scoring algorithms
   - [ ] Integration with mobile money providers

2. **Documentation**
   - [ ] API reference documentation
   - [ ] Deployment guides for AWS/Azure
   - [ ] User manuals for DCPs

3. **Testing**
   - [ ] Controller unit tests
   - [ ] Service layer integration tests
   - [ ] E2E scenarios

4. **Internationalization**
   - [ ] Swahili language support
   - [ ] Multi-currency handling

## Questions?

- Open an issue for bugs or feature requests
- Check existing documentation in `/docs`
- Review closed issues for similar discussions

---

**Built with ❤️ for Kenya's Digital Lending ecosystem**
