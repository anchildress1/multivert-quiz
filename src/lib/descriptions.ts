/**
 * Multivert — Type Descriptions (v2)
 *
 * Long-form copy shown in the per-archetype detail sheet on the results page.
 * The `headline` + `body` pair is the summary view (also used on the result
 * lede); `deep` is the click-through editorial spread.
 *
 * Voice: conversational, scenic, slightly wry. Headlines are metaphors, not
 * definitions. Each section distinguishes the type from its near-neighbour
 * rather than rehearsing the canonical definition.
 *
 * Sources informing v2 copy:
 *   - IPIP Big Five (extraversion construct) — Wikipedia / SimplyPsychology
 *   - Adam Grant, Psychological Science 2013 (ambivert advantage)
 *   - Cleveland Clinic — Introvert / Ambivert / Omnivert / Otrovert explainers
 *   - Rami Kaminski (2025), The Gift of Not Belonging — The Otherness Institute
 *   - Big Think profile of "otroverts" (2024)
 */

import type { Archetype } from './archetypes';

/** Re-exported for back-compat with existing call sites. Single source of truth: `Archetype`. */
export type VertType = Archetype;

export interface DeepDescription {
	/** 4–5 specific, scenic observations. Bullets, not definitions. */
	signs: readonly string[];
	/** What outsiders misread this type as — corrected in one breath. */
	mistakenFor: string;
	/** What the type is actually good at. 1–2 sentences. */
	gifts: string;
	/** The drains, blind spots, costs of being wired this way. 1–2 sentences. */
	costs: string;
	/** How this type comes back online. One scenic sentence. */
	recharge: string;
	/** Inline citations rendered as a tight credits roll at the bottom. */
	sources: readonly string[];
}

export interface TypeDescription {
	type: VertType;
	headline: string;
	body: string;
	deep: DeepDescription;
}

export const descriptions: Readonly<Record<VertType, TypeDescription>> = Object.freeze({
	introvert: {
		type: 'introvert',
		headline: "You're not antisocial — you're battery-operated.",
		body: 'People aren\'t your problem. Recovery time is your fuel. You can absolutely show up, charm a room, hold court at a dinner — but every hour spent doing it costs you, and you need the math to balance. Most "introverts" online are actually shy or anxious. You\'re neither. You just have a meter, and you respect it.',
		deep: {
			signs: [
				'You can be the warmest person in a room and still leave craving the drive home alone.',
				'Group chats feel louder than rooms full of people.',
				'A cancelled plan lands as a small, illegal pleasure.',
				'You go quiet to think, not to sulk — but people read it as the same thing.',
				'The day after a great party, you need a flat, empty Saturday to put yourself back together.'
			],
			mistakenFor:
				'Shy. Depressed. Aloof. "Low-energy." None of those — you\'re full-bandwidth, you just have a meter.',
			gifts:
				'You think before you speak, which means you tend to say something. You notice the person standing slightly outside the conversation, because that has been you. Solo work has weight; a small number of relationships, deep enough to matter.',
			costs:
				"The recharge is non-negotiable. Skip it three times in a row and you stop being yourself — you become a shorter, brittler version of yourself, and you're the last to notice.",
			recharge:
				"A whole afternoon nobody can reach you. A book that isn't homework. A walk where the loudest thing is the wind.",
			sources: [
				'IPIP Big Five — extraversion construct',
				'Susan Cain, *Quiet* (2012)',
				'Cleveland Clinic — Introverts vs. Extroverts'
			]
		}
	},

	extrovert: {
		type: 'extrovert',
		headline: 'Other people are your espresso.',
		body: "You think out loud. Solitude isn't peaceful — it's static. The energy in a crowded room is how you find your edges. A quiet weekend with no plans gives you a vague itch that gets cured by a noisy dinner. People aren't input you process; they're the field you play on.",
		deep: {
			signs: [
				"You finish your sentences out loud. Finishing them silently feels like it didn't count.",
				'A free Friday with no plans starts as freedom and ends as static.',
				"You make decisions faster after you've talked them through with three people.",
				'The room walks in five degrees warmer once you arrive, and you can feel that.',
				"You can read a silence — but you can't really live in one."
			],
			mistakenFor:
				'Loud. Attention-seeking. Shallow. Sometimes loud — fine. The other two are usually projection from people the noise costs.',
			gifts:
				'You move plans from "we should" to "we did." You connect strangers without thinking about it. You bring temperature to flat rooms — most leadership lives here, and most repair work, too.',
			costs:
				"Solitude doesn't work as a tool yet. Without people in the loop your thinking goes circular. You can over-explain. You can over-promise.",
			recharge:
				'The walk, but with someone. The "casual" dinner that ran four hours. A noisy market on a Saturday afternoon.',
			sources: [
				'IPIP Big Five — extraversion construct',
				'Cleveland Clinic — Introverts vs. Extroverts',
				'Wikipedia — Big Five personality traits'
			]
		}
	},

	ambivert: {
		type: 'ambivert',
		headline: "You don't have a default setting — you have a dial.",
		body: "You're the one nobody can guess at the party. At the team dinner you're loud; at the work mixer you're listening; at a family event you're somehow both. Your trick isn't being in the middle — it's reading the room and becoming the answer. Adam Grant's sales research found ambiverts often outperform pure types in roles that need both modes. You're not undecided. You're situational.",
		deep: {
			signs: [
				'People who met you at a wedding describe you completely differently from people who met you at work — and both are right.',
				'"Are you an introvert or extrovert?" makes you pause, not because you don\'t know — because both answers are partly true.',
				'You can host. You can hide. Neither is a costume.',
				"You leave parties when *you've* had enough, not when the room shifts.",
				"You're often the person someone ends up talking to one-on-one in the kitchen, even at a party of forty."
			],
			mistakenFor:
				'Wishy-washy. "Depends on her mood." Undecided. None of that — you\'re situational, which is harder than picking a lane and sticking to it.',
			gifts:
				"Adam Grant's 2013 sales study found ambiverts outsell pure extroverts. You read pressure. You match it. You're hard to mis-cast and harder to bore.",
			costs:
				"People can't predict you, which means they sometimes don't book you. The dial costs energy to turn — most people only have a switch, and don't notice you're working.",
			recharge:
				"Whatever the last week wasn't. A loud dinner if it's been quiet. A novel if it's been a conference.",
			sources: [
				'Adam Grant, *Rethinking the Extraverted Sales Ideal: The Ambivert Advantage*, Psychological Science (2013)',
				'Cleveland Clinic — What Is an Ambivert?',
				'Truity — Ambivert vs. Omnivert'
			]
		}
	},

	omnivert: {
		type: 'omnivert',
		headline: 'Two settings: full volume or off-grid.',
		body: "You're not balanced like an ambivert. You're a power switch, not a dial. One week you're hosting brunches and texting everyone; the next, your phone is in a drawer and you'd pay to be left alone. Both modes are completely you. Friends sometimes call this \"moody\" — wrong. It's a binary, not a mood. You just don't have a third gear.",
		deep: {
			signs: [
				"One week you're proposing the dinner. The next, you're ignoring the group chat about it.",
				"Your phone is either everyone's favourite or face-down in a drawer. There is no in-between week.",
				'You can give the wedding speech on Saturday and not answer a single text on Sunday — both are real.',
				'Friends say "I never know which one I\'m going to get." Not as a complaint. More like a weather report.',
				"You don't drift between modes. You cut over."
			],
			mistakenFor:
				"Moody. Flaky. Bipolar — which it isn't, and which is a real condition, so don't self-diagnose. If the swings cause distress, that's a clinician's job, not a quiz's.",
			gifts:
				"When you're on, you're really on — the kind of presence rooms reorganise around. When you're off, you actually rest, which most people can't do without guilt.",
			costs:
				"People read inconsistency as unreliability. The off-week often follows the on-week without warning — including to you, which is the part that's genuinely tiring.",
			recharge: 'A literal door, closed, for a literal weekend. Then you come back loud.',
			sources: [
				'Cleveland Clinic — Omnivert vs. Ambivert',
				'Simply Psychology — What Is an Omnivert?',
				'Truity — Ambivert vs. Omnivert'
			]
		}
	},

	otrovert: {
		type: 'otrovert',
		headline: 'Friendly to everyone. Member of nothing.',
		body: [
			"You can host the party, give the lecture, MC the show — and you might enjoy it. But sign on as a regular member of anything? That's where it cracks. Clubs, teams, friend groups, fandoms — all guest appearances, never regular cast.",
			"You don't run on group consensus. You examine ideas yourself before adopting them, and you don't feel any urge to convince other people of what you believe. Mass movements tend to pass you by — including the ones you quietly agree with.",
			'Privacy is structural, not preferential. You curate what people see, keep close-held things actually close, and decline to perform a public version of yourself even in places where everyone else does.',
			'Friendships are deep and one-on-one. There\'s no "social circle." There never was.',
			'Coined by psychiatrist Rami Kaminski in 2025. Same wiring as Frida Kahlo, Einstein, Virginia Woolf, Franz Kafka. Make of that what you will.'
		].join('\n\n'),
		deep: {
			signs: [
				'You can host the party. You will not join the group chat about the party.',
				'"We" never quite feels like the right pronoun, even at the family dinner.',
				'You examine ideas before adopting them — including the ones everyone you love already agrees with.',
				"You're warm in conversation and private in inventory. Almost nobody knows everything.",
				"You catch yourself observing the room you're inside of. You always have."
			],
			mistakenFor:
				'Aloof. Anti-social. Contrarian. "Too in your head." All wrong — you\'re warm, you just don\'t fuse. Outsiders read the lack of fusion as distance.',
			gifts:
				"You're hard to indoctrinate, which makes you hard to manipulate. You see the edges of group consensus that members can't. Your friendships are deep because they were chosen, not absorbed.",
			costs:
				"Belonging is a real human need, and you don't get the easy version of it. The community most people inherit, you have to build by hand, one person at a time.",
			recharge:
				'A long, real conversation with one person. Solo work nobody is watching. A walk through a city where nobody knows you.',
			sources: [
				'Rami Kaminski, MD — *The Gift of Not Belonging* (2025)',
				'The Otherness Institute',
				'Cleveland Clinic — Otrovert: An Emerging Personality Type',
				'Big Think — *"Otroverts" and why nonconformists often see what others can\'t*'
			]
		}
	}
});
