# Multivert Quiz

A credible, free, sharable web quiz that classifies takers across all five
"vert" types — **introvert**, **extrovert**, **ambivert**, **omnivert**, and
**otrovert** — using a multi-axis scoring model that respects each type's
defining feature. Every taker sees five independent fit percentages with a
dominant-type headline, plus links to peer-reviewed and clinical sources.

> Built with vibes, AI, and a small pile of cited research. Not a diagnosis.
> Don't put it on your résumé.

## Stack

- **SvelteKit** (Svelte 5) + **Tailwind CSS**
- **`@sveltejs/adapter-cloudflare`** — deploys to **Cloudflare Pages**
- **TypeScript** (strict)
- **Vitest** + **Playwright** + **Lighthouse CI**

## Getting started

```sh
make install   # install dependencies
make dev       # start the dev server
make test      # run unit + integration tests
make e2e       # run Playwright E2E
make build     # production build
```

See the [`Makefile`](./Makefile) for the full target list.

## Documentation

- [`docs/PRD.md`](./docs/PRD.md) — product requirements, scoring model, and locked weight matrices.
- [`AGENTS.md`](./AGENTS.md) — repository conventions for AI agents and contributors.

## License

[Polyform Shield 1.0.0](./LICENSE) — Copyright © 2026 Ashley Childress.

Personal, professional, and commercial _use_ is permitted; _monetization_ (sale,
paid SaaS, rebranded resale) requires prior written permission.
