# Claude Code instructions

Read [`AGENTS.md`](./AGENTS.md) first — it is the source of truth for stack
choices, commands, quality gates, and style. The notes below are Claude-specific
reminders.

## Hard rules

- Never commit directly to `main`. Always work on a topic branch and open a PR.
- Atomic commits. Never combine refactors with feature work.
- Every commit message ends with a `Generated-by: <model name>` footer plus the
  Anthropic `Co-Authored-By` line. The commitlint RAI plugin enforces this.
- The scoring engine (`src/lib/scoring.ts`) is deterministic. Do not introduce
  AI calls into the scoring path — AI is only for result-copy tone.
- All warnings are errors. Do not silence warnings to make CI pass.
- Tests are required for every code change, including positive/negative/error/edge cases.

## Before pushing

Run, in order:

```sh
make format
make lint
make typecheck
make test
make build
```

Then run the Sonar and Semgrep MCPs against the staged diff and resolve any
findings before pushing. CI will re-run all of these.

## Common pitfalls

- Tailwind v4 uses `@import 'tailwindcss'` in `src/app.css`. Do not add a
  `tailwind.config.*` file — there isn't one.
- `svelte.config.js` is JS (not TS) so the adapter import resolves cleanly.
- `tsconfig.json` extends `./.svelte-kit/tsconfig.json`. Run `pnpm exec svelte-kit
sync` after fresh installs if path aliases (`$lib`, `$app/*`) are missing.
- For Cloudflare Pages routing, build output lives in `.svelte-kit/cloudflare`
  (not `build/`). The deploy workflow points there explicitly.
