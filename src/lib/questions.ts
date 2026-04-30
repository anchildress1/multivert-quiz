/**
 * Multivert — Question Bank (v1)
 *
 * 35 questions across 4 dimensions:
 *   - extraversion (10) — adapted from IPIP-NEO Big Five extraversion constructs;
 *                          rewritten in voice with specific, varied scenarios.
 *   - belonging    (15) — custom items. The 11 reverse (otrovert) items cover 5
 *                          distinct facets documented by The Otherness Institute
 *                          (Kaminski):
 *                            1. group non-belonging / no social circle
 *                               (b-01, b-03, b-08, b-09)
 *                            2. role confidence vs. casual-member discomfort
 *                               (b-07, b-10)
 *                            3. independent thinking / maverick (b-11, b-12)
 *                            4. privacy / curated narrative (b-14)
 *                            5. indifference to mass movements / approval
 *                               (b-13, b-15)
 *   - group_size   (5)  — large-group ↔ 1:1 preference, with varied scenarios.
 *   - swings       (5)  — distinct facets of intro↔extro oscillation: week-level
 *                          flip (cancel one day, host the next), no-middle-gear
 *                          binary, others' uncertainty about which social mode
 *                          shows up, within-event flip, same-plan flip across
 *                          time. Deliberately not "moodiness" — the omnivert
 *                          construct is specifically social-energy toggling.
 *
 * Voice: conversational, scenic, slightly wry. Each item names a concrete
 * setting (party, coffee shop, wedding toast, work happy hour, etc.) so the
 * user is rating their behavior in a recognizable situation rather than
 * answering an abstract trait question.
 *
 * Sliders return values in [-1, 1] where:
 *   -1 = "not at all like me"
 *    0 = neutral (deliberate answer; distinct from "unset")
 *   +1 = "exactly like me"
 *
 * Dimension polarity (after reverse-score sign-flip):
 *   - extraversion: -1 = introvert pole, +1 = extrovert pole
 *   - belonging:    -1 = otrovert pole (low belonging), +1 = strong group identification
 *   - group_size:   -1 = prefers 1:1 / small, +1 = thrives in large groups
 *   - swings:       -1 = stable, +1 = dramatic situational swings
 *
 * `reverse: true` means an item's response should be sign-flipped before
 * being aggregated into its dimension score.
 *
 * Reverse-scored ratio: 18/35 ≈ 51%. Heavier than typical 25–33% because the
 * belonging dimension is deliberately tilted toward otrovert-pole items
 * (11 reverse vs. 4 forward) — the otrovert construct is multi-faceted and
 * we want adequate signal across all 5 documented facets.
 *
 * Note for the scoring engine: the swings items are the direct omnivert
 * signal. This one-shot quiz does not treat disagreement across unrelated
 * extraversion items as longitudinal state variability.
 *
 * Otrovert-construct caveat: per Kaminski / The Otherness Institute, otroverts
 * can be confident and outgoing when in a defined role (host, MC, lecturer).
 * Extraversion items in this bank deliberately measure casual / unstructured
 * social behavior, not role-based confidence — so an otrovert and an extrovert
 * differ on the belonging axis, not the extraversion axis.
 *
 * Sources:
 *   - IPIP-NEO Big Five: https://ipip.ori.org/
 *   - The Otherness Institute (Kaminski): https://www.othernessinstitute.com/traits-of-otherness/
 */

import type { Dimension } from './archetypes';
export type { Dimension } from './archetypes';

export interface Question {
	/** Stable ID used in scoring + analytics. Format: <dim>-<nn>. */
	id: string;
	/** Statement shown to the user. */
	text: string;
	/** Which dimension this item contributes to. */
	dimension: Dimension;
	/** If true, sign-flip the response before aggregating. */
	reverse: boolean;
	/** Optional provenance for credibility/citation. */
	source?: string;
}

export const questions: Question[] = [
	// ─── Extraversion (10) ──────────────────────────────────────────────
	// Adapted from IPIP-NEO Big Five extraversion construct.
	// Items deliberately measure casual / unstructured social behavior to
	// avoid conflating extraversion with otroverts' role-based confidence.

	{
		id: 'e-01',
		text: "At a friend's birthday party, I usually end up in the middle of the action.",
		dimension: 'extraversion',
		reverse: false,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-02',
		text: "I'd rather listen to other people's stories than tell my own.",
		dimension: 'extraversion',
		reverse: true,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-03',
		text: 'I can sit in a packed coffee shop for an hour without it draining me.',
		dimension: 'extraversion',
		reverse: false,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-04',
		text: "At a group dinner, I'd rather sit at the quiet end than in the busy middle.",
		dimension: 'extraversion',
		reverse: true,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-05',
		text: "Standing in a long line, I'm the one who'll start chatting with the person next to me.",
		dimension: 'extraversion',
		reverse: false,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-06',
		text: 'In a meeting or class, I usually let other people do most of the talking.',
		dimension: 'extraversion',
		reverse: true,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-07',
		text: "When I'm at an event where I only know a couple people, I'd rather meet new ones than stick with who I came in with.",
		dimension: 'extraversion',
		reverse: false,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-08',
		text: 'When a teacher or presenter asks for a volunteer, I shrink back rather than raise my hand.',
		dimension: 'extraversion',
		reverse: true,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-09',
		text: 'When the whole room turns to look at me, I stay relaxed.',
		dimension: 'extraversion',
		reverse: false,
		source: 'IPIP-NEO (adapted)'
	},
	{
		id: 'e-10',
		text: "I'm quieter around people I don't know.",
		dimension: 'extraversion',
		reverse: true,
		source: 'IPIP-NEO (adapted)'
	},

	// ─── Belonging (15) ─────────────────────────────────────────────────
	// Forward items (4): identification with specific kinds of groups (teams,
	//   alumni, congregations, hobby rituals).
	// Reverse items / otrovert signal (11): drawn from Kaminski / Otherness
	//   Institute documented traits — observer-not-member, no social circle,
	//   role-based comfort vs. casual-member discomfort, maverick thinking,
	//   privacy / curated narrative, indifference to mass movements / approval.

	{
		id: 'b-01',
		text: 'Being part of a group has never really run my calendar — my week follows my own rhythm, not theirs.',
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-02',
		text: "When I introduce myself, I lead with what I'm part of — team, church, neighborhood — before I get to what I do for work.",
		dimension: 'belonging',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'b-03',
		text: "Team logos, alumni gear, inside jokes — that whole 'this is who we are' shorthand has never really stuck to me.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-04',
		text: 'Reunions, traditions, annual gatherings — that kind of recurring group event is some of my favorite stuff on the calendar.',
		dimension: 'belonging',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'b-05',
		text: "Belonging somewhere is a big part of what makes me feel like me — without it, I'd feel like a smaller version of myself.",
		dimension: 'belonging',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'b-06',
		text: "I'm most myself at recurring rituals — Sunday dinner, standing meetup, weekly hangout, the kinds of things that anchor a week.",
		dimension: 'belonging',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'b-07',
		text: "Even when a club or league fits my vibe exactly, I freeze at the part where I'd actually sign on as a regular member.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-08',
		text: 'I can be friendly with everyone in a group and still feel like an observer rather than a member.',
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-09',
		text: "I have close one-on-one friendships, but I don't really have a social circle.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-10',
		text: "I'm comfortable in groups when I have a defined role (host, organizer, MC). As just another member? Much less so.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-11',
		text: 'I examine ideas for myself before adopting them — popularity does not make something true.',
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-12',
		text: "I don't feel any need to convince other people of what I believe.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-13',
		text: 'Causes everyone agrees on tend to make me skeptical, not enthusiastic.',
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-14',
		text: 'Most people in my life only see a curated version of me — even ones who think they know me well.',
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},
	{
		id: 'b-15',
		text: "I don't need any group's approval to feel solid in who I am.",
		dimension: 'belonging',
		reverse: true,
		source: 'Otherness Institute'
	},

	// ─── Group size preference (5) ──────────────────────────────────────
	// Each item names a different concrete scenario.
	// +1 = thrives in large groups, -1 = thrives 1:1.

	{
		id: 'g-01',
		text: 'Given a choice between a 50-person house party and dinner with two close friends, I pick the party.',
		dimension: 'group_size',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'g-02',
		text: 'A big holiday gathering with extended family energizes me more than it tires me out.',
		dimension: 'group_size',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'g-03',
		text: 'When friends ask "big group brunch or just us two?", I\'m voting big group.',
		dimension: 'group_size',
		reverse: false,
		source: 'custom'
	},
	{
		id: 'g-04',
		text: "I'd rather have one two-hour deep conversation than meet twenty new people in the same time.",
		dimension: 'group_size',
		reverse: true,
		source: 'custom'
	},
	{
		id: 'g-05',
		text: "I can handle a packed event, but I'd rather be on a couch with one or two people any day.",
		dimension: 'group_size',
		reverse: true,
		source: 'custom'
	},

	// ─── Swings (5) ─────────────────────────────────────────────────────
	// Five distinct facets of intro↔extro oscillation. Each item must
	// unambiguously measure social-energy toggling, not generic moodiness —
	// the omnivert construct is specifically "you swing between intro and
	// extro modes," not "you have mood swings."
	//   s-01 — week-level intro↔extro flip (cancel one day, host the next)
	//   s-02 — no middle gear (binary social-energy state, not a spectrum)
	//   s-03 — others can't predict which social mode shows up
	//   s-04 — within-event intro↔extro flip (peak then fade)
	//   s-05 — same-plan intro↔extro flip across time

	{
		id: 's-01',
		text: 'Monday I might cancel plans to be alone. Wednesday I might host five people for dinner. Same week.',
		dimension: 'swings',
		reverse: false,
		source: 'custom'
	},
	{
		id: 's-02',
		text: 'I swing between all-in and off-grid — never a mild middle.',
		dimension: 'swings',
		reverse: false,
		source: 'custom'
	},
	{
		id: 's-03',
		text: "My friends never know whether I'll show up wanting to work the room or wanting to leave by 9.",
		dimension: 'swings',
		reverse: false,
		source: 'custom'
	},
	{
		id: 's-04',
		text: 'I can be the loudest person in the room at 9pm and need to disappear by 10:30 — both are equally me.',
		dimension: 'swings',
		reverse: false,
		source: 'custom'
	},
	{
		id: 's-05',
		text: 'Same crowd, same plan, different week — one time I work the room, the next I find the quietest corner.',
		dimension: 'swings',
		reverse: false,
		source: 'custom'
	}
];

// ─── Sanity counts (runtime sanity check; values are computed lazily) ───
export const QUESTION_COUNT_BY_DIMENSION = {
	extraversion: questions.filter((q) => q.dimension === 'extraversion').length,
	belonging: questions.filter((q) => q.dimension === 'belonging').length,
	group_size: questions.filter((q) => q.dimension === 'group_size').length,
	swings: questions.filter((q) => q.dimension === 'swings').length
} as const;

// Expected: { extraversion: 10, belonging: 15, group_size: 5, swings: 5 } → total 35
