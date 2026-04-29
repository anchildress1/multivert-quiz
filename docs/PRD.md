# Multivert — PRD v1

## Problem Statement

Existing personality quizzes covering the introvert/extrovert spectrum do not include the otrovert classification (Kaminski, 2025) and conflate omnivert with ambivert. Users searching for "what vert am I" find quizzes that misclassify them or omit the type that actually fits. The goal: a credible, free, sharable web quiz that covers all five current types and is deployable from a personal repo.

## Goals

1. **Identify all 5 types from one quiz** — introvert, extrovert, ambivert, omnivert, otrovert — using a multi-axis scoring model that respects each type's defining feature.
2. **Quantitative result, not single bucket** — every taker sees 5 independent fit percentages (each on its own 0–100% scale) with a dominant-type headline. Types are not mutually exclusive: a strong introverted otrovert can legitimately score high on both because they live on different axes.
3. **Credibility by source-citation** — results page links to peer-reviewed sources (Big Five / IPIP, Conklin 1923, Grant 2013) for the established types and clinical sources (Kaminski, Cleveland Clinic) for novel types.
4. **Static-deployable on Cloudflare Pages** — no backend required for v1; free hosting on `pages.dev`.
5. **Polished, modern UX** — SvelteKit + Tailwind + Svelte transitions. Mobile-first.

## Non-Goals (v1)

1. **Account creation, saved sessions, login** — anonymous one-shot quiz; no data persistence. Cuts complexity, avoids GDPR/cookie-banner work.
2. **AI-driven clarifying questions** — evaluated and rejected upstream; a deterministic 30-question quiz handles ambiguity through aggregation.
3. **Event-level analytics (completion rate, drop-off, abandonment)** — Cloudflare Web Analytics gives page views + referrers only; richer event tracking deferred to Phase 2.
4. **Custom domain** — `*.pages.dev` is sufficient for v1; domain purchase deferred until promo bot is live.
5. **Calibration / attention-check items** — adds friction with no benefit since data isn't kept and no high-stakes decision rides on the result.
6. **Result sharing (social share buttons, OG-image generation)** — Phase 2.
7. **Multilingual support** — English-only.

## User Stories

- As someone who's seen "otrovert" online and wants to know if it fits, I want a quiz that actually measures for it so I can find out without wading through five outdated tests.
- As a casual taker, I want continuous sliders (not radio buttons) so I can express _how strongly_ each statement matches me.
- As a mobile user, I want sliders that work cleanly on touch without accidental drags.
- As someone who scores ambiguously between two types, I want to see how strongly I match each one independently, instead of being arbitrarily bucketed.
- As a credibility-conscious reader, I want sources cited and a clear "for entertainment, not clinical" disclaimer so I know what this is and isn't.
- As Ashley (the builder), I want a clean, modern stack (SvelteKit + Tailwind + Cloudflare Pages) so deploying and iterating is fast.

## Requirements

### P0 — Must-Have for v1

**Question bank**

30 questions across 4 dimensions, each item scored on a slider in [-1, +1]:

| Dimension      | Items | Polarity (-1 ↔ +1)                                     |
| -------------- | ----- | ------------------------------------------------------ |
| `extraversion` | 10    | introvert ↔ extrovert                                  |
| `belonging`    | 10    | otrovert (low belonging) ↔ strong group identification |
| `group_size`   | 5     | prefers 1:1 / small ↔ thrives in large groups          |
| `swings`       | 5     | stable ↔ dramatic situational swings (omnivert signal) |

- **33% reverse-scored** (10 of 30), flagged in question metadata, sign-flipped at scoring time.
- **All items rewritten in the quiz's own voice** — meaning preserved, tone customized for engagement. Differentiates from the dozens of IPIP-verbatim quizzes already online.
- Source mix: 10 extraversion items adapted from IPIP-NEO Big Five extraversion constructs; 20 custom items. Belonging items are derived from Kaminski's described characteristics of otroversion and are not clinically validated — flagged in disclaimer.

**Input**

- Continuous slider, range -1.0 to 1.0, center = 0 = "neither agree nor disagree" (a deliberate, valid answer).
- **Unset by default**: slider has no thumb / placeholder visual until the user interacts with it. Distinguishes "not yet answered" from "deliberately neutral" — same pattern as 16personalities' radio buttons.
- Required-interaction gating: "next" disabled until the slider has been moved on each question.
- Visible "X of 30 answered" counter alongside the per-question progress.
- Large mobile hit targets.

**Flow**

- Progress bar: "Question X of 30" + visible fill.
- Forward + backward navigation between questions.
- Single results page at the end.

**Scoring engine** (pure TS, unit-testable)

- Each dimension score = mean of its items (after reverse-score sign-flip).
- **Derived variance signal feeds into `swings`**: within-dimension variance of the user's extraversion answers (after sign-flip) is computed and added to the swings input. Translation: if a user agrees with both "I am the life of the party" _and_ "I keep in the background," that contradiction reads as an omnivert signal without consuming question slots.
- Per-archetype weighted Euclidean distance using the locked weight matrix below.
- Distance → fit score on a 0–100% scale per archetype, **independent** (no cross-archetype normalization). Higher = closer match.
- Dominant type = archetype with the highest fit score.

**Locked archetype weight matrix** (extra / belong / size / swings):

| Archetype | Extra | Belong   | Size | Swings   |
| --------- | ----- | -------- | ---- | -------- |
| Extrovert | 0.50  | 0.20     | 0.20 | 0.10     |
| Introvert | 0.50  | 0.20     | 0.20 | 0.10     |
| Ambivert  | 0.55  | 0.15     | 0.20 | 0.10     |
| Otrovert  | 0.10  | **0.60** | 0.20 | 0.10     |
| Omnivert  | 0.05  | 0.05     | 0.05 | **0.85** |

**Locked archetype ideal vectors** (target dimension scores in [-1, 1]):

| Archetype | Extra | Belong | Size | Swings |
| --------- | ----- | ------ | ---- | ------ |
| Extrovert | +0.7  | +0.5   | +0.7 | -0.5   |
| Introvert | -0.7  | +0.5   | -0.7 | -0.5   |
| Ambivert  | 0.0   | +0.5   | 0.0  | -0.5   |
| Otrovert  | 0.0   | -0.7   | -0.5 | -0.5   |
| Omnivert  | 0.0   | 0.0    | 0.0  | +0.8   |

**Results page**

- Dominant-type headline (e.g., "You are an Otrovert").
- 5 independent fit percentage bars, one per type. Each bar shows how closely the user matches that archetype on its own 0–100% scale. Bars do not sum to 100%.
- Per-type description paragraphs, with prominence on novel types.
- Source citations (Big Five / IPIP, Grant 2013, Cleveland Clinic, Kaminski).
- Disclaimer: _"Built with vibes, AI, and a small pile of cited research. Not a diagnosis. Don't put it on your résumé."_

**Stack & deploy**

- SvelteKit (Svelte 5) + Tailwind + `adapter-cloudflare`.
- Mobile-first responsive design.
- Cloudflare Web Analytics script in root layout.
- Deploys to Cloudflare Pages on git push.

### P1 — Nice-to-Have

- Svelte `transition:` / `animate:` on question changes (fade/slide), tweened progress bar via `tweened` store, animated results reveal.
- Keyboard navigation (arrow keys nudge slider, Enter advances).

### P2 — Future Considerations

- **Event tracking for completion rate / drop-off** — homegrown Cloudflare Function + KV counter recommended over third-party tools (free, all-Cloudflare, ~30 lines).
- **Light/dark mode toggle**.
- **Result sharing** — OG-image generation, share buttons.
- **Save/resume** — sessionStorage-based mid-quiz resumption.
- **A/B testing on question wording**.
- **Multilingual support**.

## Success Metrics

### Leading (days–weeks)

- Quiz live and reachable on `pages.dev` — binary, day 1.
- Real-device mobile pass (iOS Safari, Chrome Android) — no slider failures.
- Cloudflare Web Analytics: bounce rate on `/quiz` < 60% on first 100 organic visitors.

### Lagging (weeks–months)

- Completion rate > 50% — _requires P2 event tracking; flagged as a gap in v1._
- Subjective: at least one piece of unsolicited positive feedback. Quiz earns its keep as a portfolio piece.

Targets are deliberately conservative — this is a personal project, not a revenue feature. Success = it works, looks good, and ships.

## Open Questions

1. **(Design, non-blocking)** Slider visual treatment (gradient fill? tick marks? plain track? unset-state visual?) — deferred to a `design:` skill pass.

2. **(Content, non-blocking)** Type-description copy — write inline during build, or do a dedicated content pass?

## Timeline & Phasing

No hard deadline. Suggested phasing:

| Phase             | Scope                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Week 1            | Scoring engine + 30-question bank (logic locked, unit-testable in isolation) |
| Week 2            | SvelteKit scaffold, slider component, quiz flow                              |
| Week 3            | Results page, polish/animations, deploy to `pages.dev`                       |
| Future (optional) | Event tracking, custom domain, share-card generation                         |

No external dependencies. All choices within Ashley's control.

## Risks (carried over from design pass)

| #   | Risk                                                      | Disposition                                                          |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | 30 questions → abandonment risk (~30%+)                   | Address — progress bar + counter + animations                        |
| 2   | Slider UX finicky on mobile                               | Address — large hit targets, unset-state visual                      |
| 3   | Can't distinguish "answered neutral" from "didn't answer" | Address — unset-state visual + interaction gating + answered-counter |
| 4   | Reverse-scored items confuse fast readers                 | Accept — psychometric standard                                       |
| 5   | 5-way result may confuse vs. single bucket                | Designed for — dominant headline + breakdown                         |
| 6   | Otrovert is novel; users won't know it                    | Address — type descriptions + source links                           |
| 7   | Disclaimer placement / clinical-framing exposure          | Address — footer + results page                                      |
| 8   | No analytics for drop-off in v1                           | Accept — Phase 2 if needed                                           |
| 9   | SvelteKit `paths.base` on `pages.dev`                     | Address — config from day one                                        |
| 10  | Zod overkill                                              | Resolved — dropped, plain TS                                         |

## Sources

- [IPIP-BFFM Big Five Test (openpsychometrics)](https://openpsychometrics.org/tests/IPIP-BFFM/)
- [Adam Grant — Rethinking the Extraverted Sales Ideal (Wharton, 2013)](https://faculty.wharton.upenn.edu/wp-content/uploads/2013/06/Grant_PsychScience2013.pdf)
- [Cleveland Clinic — Omnivert vs Ambivert](https://health.clevelandclinic.org/omnivert-vs-ambivert)
- [Cleveland Clinic — Otroverts: An Emerging Personality Type](https://health.clevelandclinic.org/otrovert)
- [Otrovert — Wikipedia](https://en.wikipedia.org/wiki/Otrovert)
- [LADbible — Dr. Rami Kaminski explains otrovert](https://www.ladbible.com/community/personality-type-otrovert-explained-dr-rami-kaminski-378511-20250912)
