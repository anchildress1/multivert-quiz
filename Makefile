.PHONY: install dev format format-check lint typecheck test test-coverage build preview e2e e2e-install perf secret-scan clean help

PNPM ?= pnpm

help:
	@echo "Targets:"
	@echo "  install       Install dependencies (frozen lockfile)"
	@echo "  dev           Run the SvelteKit dev server"
	@echo "  format        Format files with Prettier"
	@echo "  format-check  Check formatting without writing"
	@echo "  lint          Prettier check + ESLint"
	@echo "  typecheck     svelte-check (TypeScript + Svelte)"
	@echo "  test          Run unit tests (Vitest)"
	@echo "  test-coverage Run unit tests with coverage report"
	@echo "  build         Production build (vite + adapter-cloudflare)"
	@echo "  preview       Preview the production build locally"
	@echo "  e2e           Run Playwright E2E"
	@echo "  e2e-install   Install Playwright browsers (chromium + deps)"
	@echo "  perf          Run Lighthouse CI"
	@echo "  secret-scan   Run gitleaks against staged diff"
	@echo "  clean         Remove build artifacts and caches"

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

format:
	$(PNPM) format

format-check:
	$(PNPM) format:check

lint:
	$(PNPM) lint

typecheck:
	$(PNPM) check

test:
	$(PNPM) test

test-coverage:
	$(PNPM) test:coverage

build:
	$(PNPM) build

preview:
	$(PNPM) preview

e2e:
	$(PNPM) e2e

e2e-install:
	$(PNPM) e2e:install

perf:
	$(PNPM) perf

secret-scan:
	$(PNPM) secret-scan

ai-checks: secret-scan format lint typecheck test

clean:
	rm -rf .svelte-kit build dist coverage .lighthouseci playwright-report test-results .wrangler .vite
