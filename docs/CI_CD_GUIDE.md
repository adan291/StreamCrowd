# CI/CD Guide - StreamCrowd

**Date:** January 18, 2026  
**Status:** Production Ready  
**Version:** 1.0.0

---

## 📋 Overview

StreamCrowd uses a comprehensive CI/CD pipeline to ensure code quality, prevent bugs, and automate deployments. This guide covers all aspects of our continuous integration and deployment process.

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
1. **Lint & Type Check** - ESLint, circular imports, TypeScript
2. **Unit Tests** - Vitest with coverage reporting
3. **E2E Tests** - Playwright browser tests
4. **Build Check** - Production build validation
5. **Bundle Size** - Size analysis and PR comments
6. **Security Audit** - npm audit and Snyk scanning
7. **i18n Validation** - Translation completeness check

**Status Checks:**
- All jobs must pass before merging
- Coverage reports uploaded to Codecov
- Bundle size changes commented on PRs

#### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)

Runs on push to `main` branch or manual trigger.

**Steps:**
1. Run tests
2. Build production bundle
3. Deploy to Vercel
4. Create deployment notification

---

## 🪝 Git Hooks (Husky)

### Pre-commit Hook

Runs before each commit:

```bash
# .husky/pre-commit
npx lint-staged
npm run lint:check-cycles
```

**What it does:**
- Formats code with Prettier
- Lints changed files with ESLint
- Checks for circular imports
- Runs TypeScript type checking

### Pre-push Hook

Runs before pushing to remote:

```bash
# .husky/pre-push
npm run test -- --run
npx tsc --noEmit
```

**What it does:**
- Runs all unit tests
- Validates TypeScript types

### Commit Message Hook

Validates commit message format:

```bash
# .husky/commit-msg
npx commitlint --edit ${1}
```

**Required format:**
```
type(scope): subject

Examples:
feat(polls): add new voting mode
fix(chat): resolve message duplication
docs(readme): update installation steps
```

**Valid types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance
- `perf` - Performance
- `ci` - CI/CD changes
- `build` - Build system
- `revert` - Revert commit

---

## 📦 Lint-Staged Configuration

Automatically formats and lints staged files:

```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'tsc --noEmit'"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

---

## 🚀 Deployment Process

### Automatic Deployment

**Trigger:** Push to `main` branch

**Process:**
1. CI pipeline runs all checks
2. If all checks pass, deploy workflow triggers
3. Production build created
4. Deployed to Vercel
5. Deployment URL posted to commit status

### Manual Deployment

**Trigger:** GitHub Actions UI

1. Go to Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow" button

---

## 🔐 Required Secrets

Configure these in GitHub repository settings:

### Vercel Deployment
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Security Scanning
- `SNYK_TOKEN` - Snyk API token (optional)

### How to add secrets:
1. Go to repository Settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Add name and value
5. Click "Add secret"

---

## 📊 Branch Protection Rules

### Main Branch

**Required:**
- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Require conversation resolution

**Status checks:**
- Lint & Type Check
- Unit Tests
- E2E Tests
- Build Check
- Bundle Size Check
- i18n Validation

### Develop Branch

**Required:**
- ✅ Require pull request before merging
- ✅ Require status checks to pass

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

**Location:** `tests/`

**Run:**
```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test -- --coverage # With coverage
```

**Coverage targets:**
- Statements: >80%
- Branches: >80%
- Functions: >80%
- Lines: >80%

### E2E Tests (Playwright)

**Location:** `tests/e2e/`

**Run:**
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # UI mode
npm run test:e2e:headed   # Headed mode
```

**Browsers tested:**
- Chromium
- Firefox
- WebKit (Safari)

### Integration Tests

**Location:** `tests/integration/`

**Focus:**
- API integrations
- Real-time sync
- Performance optimizations

---

## 📈 Quality Metrics

### Code Coverage

**Tool:** Codecov

**Reports:**
- Overall coverage percentage
- Coverage by file
- Coverage trends over time
- PR coverage diff

**Access:** https://codecov.io/gh/your-org/streamcrowd

### Bundle Size

**Tool:** Custom script + Rollup Visualizer

**Metrics:**
- Total bundle size
- Chunk sizes
- Gzipped sizes
- Size trends

**Limits:**
- Main bundle: <500KB
- Vendor chunks: <1MB each
- Total: <2MB

### Performance

**Metrics:**
- Build time
- Test execution time
- Deployment time

---

## 🔧 Local Development

### Setup

```bash
# Install dependencies
npm ci

# Setup git hooks
npm run prepare

# Start development server
npm run dev
```

### Before Committing

```bash
# Run all checks locally
npm run validate

# Format code
npm run lint:fix

# Run tests
npm run test:all
```

### Commit Message

```bash
# Good examples
git commit -m "feat(polls): add ranked choice voting"
git commit -m "fix(chat): prevent duplicate messages"
git commit -m "docs(api): update authentication guide"

# Bad examples (will be rejected)
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "updates"
```

---

## 🐛 Troubleshooting

### Pre-commit Hook Fails

**Issue:** Lint-staged fails

**Solution:**
```bash
# Fix linting errors
npm run lint:fix

# Check TypeScript errors
npx tsc --noEmit

# Stage fixes and commit again
git add .
git commit -m "your message"
```

### Pre-push Hook Fails

**Issue:** Tests fail

**Solution:**
```bash
# Run tests locally
npm run test

# Fix failing tests
# Stage fixes
git add .
git commit -m "fix(tests): resolve failing tests"
git push
```

### CI Pipeline Fails

**Issue:** GitHub Actions workflow fails

**Solution:**
1. Check workflow logs in Actions tab
2. Reproduce issue locally
3. Fix and push again

### Circular Import Detected

**Issue:** `import/no-cycle` error

**Solution:**
```bash
# Find circular imports
npm run lint:check-cycles

# Refactor to break cycle
# Common solutions:
# - Move shared code to separate file
# - Use dependency injection
# - Restructure imports
```

---

## 📚 Best Practices

### Commits

- ✅ Write clear, descriptive commit messages
- ✅ Follow conventional commit format
- ✅ Keep commits focused and atomic
- ✅ Reference issues when applicable
- ❌ Don't commit broken code
- ❌ Don't skip pre-commit hooks

### Pull Requests

- ✅ Fill out PR template completely
- ✅ Link related issues
- ✅ Add screenshots for UI changes
- ✅ Request reviews from relevant team members
- ✅ Respond to review comments
- ❌ Don't merge without approval
- ❌ Don't merge with failing checks

### Testing

- ✅ Write tests for new features
- ✅ Update tests for bug fixes
- ✅ Maintain >80% coverage
- ✅ Test edge cases
- ❌ Don't skip tests in CI
- ❌ Don't commit commented-out tests

---

## 🔄 Continuous Improvement

### Monitoring

- Review CI/CD metrics weekly
- Track build times and optimize
- Monitor test flakiness
- Update dependencies regularly

### Optimization

- Keep workflows fast (<10 minutes)
- Cache dependencies
- Parallelize jobs when possible
- Remove unused dependencies

---

## 📞 Support

### Issues

- CI/CD problems: Check workflow logs
- Hook issues: Run commands manually
- Deployment issues: Check Vercel logs

### Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Husky Docs](https://typicode.github.io/husky/)
- [Commitlint Docs](https://commitlint.js.org/)
- [Vercel Docs](https://vercel.com/docs)

---

**Last Updated:** January 18, 2026  
**Maintained By:** Development Team  
**Version:** 1.0.0

