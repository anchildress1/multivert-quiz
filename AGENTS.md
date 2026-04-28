# Repository conventions

This document is the contract for human and AI contributors working in this
repo. It is referenced from `CLAUDE.md` so Claude Code automatically respects
it.

## Stack

- **SvelteKit** (Svelte 5) with TypeScript (`strict`, `noUncheckedIndexedAccess`).
- **Tailwind CSS v4** — CSS-first via `@tailwindcss/vite`. No `tailwind.config.*`.
- **`@sveltejs/adapter-cloudflare`** — deploys to **Cloudflare Pages**.
- **pnpm 10**, **Node 24 LTS** (Volta-pinned).
- **Vitest** for unit + integration. **Playwright** for E2E. **Lighthouse CI** for perf budgets.

## Branching, commits, releases

- Default branch is `main`. Never commit directly to `main` — open a PR from a topic branch.
- Atomic commits. One logical change per commit. Never bundle unrelated changes.
- Conventional Commits (`type(scope): subject`) — enforced by commitlint.
- Every commit must carry a `Generated-by:` footer naming the AI model that produced it (the
  RAI commitlint plugin enforces this).
- Releases are managed by **Release Please** (config in `release-please-config.json`).
  Pre-1.0: minor bumps for features, patch bumps for fixes (`bump-minor-pre-major: true`).

## Commands (via Makefile)

| Target              | What it runs                             |
| ------------------- | ---------------------------------------- |
| `make install`      | `pnpm install --frozen-lockfile`         |
| `make dev`          | `pnpm dev` (Vite dev server)             |
| `make format`       | `pnpm format` (Prettier write)           |
| `make format-check` | `pnpm format:check`                      |
| `make lint`         | `pnpm lint` (Prettier check + ESLint)    |
| `make typecheck`    | `pnpm check` (svelte-check)              |
| `make test`         | `pnpm test` (Vitest)                     |
| `make build`        | `pnpm build` (Vite + adapter-cloudflare) |
| `make e2e`          | `pnpm e2e` (Playwright)                  |
| `make perf`         | `pnpm perf` (Lighthouse CI)              |
| `make secret-scan`  | `gitleaks` against staged diff           |
| `make clean`        | Remove build artifacts and caches        |

## Quality gates (no exceptions)

- TypeScript must remain in `strict` mode. No `// @ts-ignore` without an inline justification.
- All warnings are errors. ESLint, svelte-check, Vite, Prettier — zero output on a clean tree.
- Coverage thresholds: **85%** lines/functions/statements, **80%** branches (Vitest).
- Lighthouse desktop is the local target: **100** across performance,
  accessibility, best-practices, and SEO (`error`-level assertions in
  `.lighthouserc.desktop.json`). Mobile is reports-only: scores upload to
  temporary-public-storage on every run, but mobile assertions are `warn`-level
  so a sub-100 mobile score does not block. The aspirational mobile target is
  also 100/100/100/100. Lhci is **not** wired to GHA or auto-run on push —
  shared-runner variance and the strict 100 floor make it too noisy for an
  automatic gate. Run it locally before opening a release PR with
  `lefthook run perf` or `make perf`.
- Tests live alongside source as `*.test.ts` (or `*.svelte.test.ts` for component tests).
- E2E specs in `e2e/`. Smoke spec must always pass before a release tag.
- Tests cover positive, negative, error, and edge cases. Use `*.skip` only with a TODO.

## Style

- Tabs for indentation in source; 2-space soft-tabs in JSON/YAML/Markdown.
- Single quotes in TS/JS, no trailing commas, 100-column print width.
- Prefer Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`) over legacy stores
  for new components.
- Tailwind utility ordering: layout → spacing → typography → color → state. Use
  `dark:` prefixes; the document is `color-scheme: light dark`.

## Scoring engine

The scoring engine in `src/lib/scoring.ts` is **deterministic**. The locked weight matrix
and ideal vectors are in [`docs/PRD.md`](./docs/PRD.md) and **must not be changed without
a PRD revision**. AI is permitted only for tone/copy of result paragraphs — never for
score computation.

## Cloudflare Pages

- Build directory: `.svelte-kit/cloudflare`
- Build command: `pnpm build`
- Production branch: `main`
- Deploy is GHA-driven via `cloudflare/wrangler-action`. Repo secrets:
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- The deploy workflow runs **only on `release: published`** events (and
  `workflow_dispatch`), not on every push. Releases are cut by Release
  Please, so `main` only deploys when a release PR is merged.

## Security

- Never log raw quiz responses. They contain personal slider answers; PRD §Non-Goals
  forbids persistence.
- No new third-party tracking, telemetry, or marketing pixels without an issue + approval.
- Validate any external input at the boundary (URL params, KV reads). Trust internal modules.
