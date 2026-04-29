/**
 * Multivert — Type Descriptions (v1)
 *
 * Copy shown on the results page. One block per type.
 * Voice: conversational, scenic, slightly wry. Each headline is a metaphor,
 * not a definition. Each body distinguishes the type from its near-neighbor.
 *
 * NOTE: this is v1 copy — locked enough to ship a POC, but expected to iterate.
 *
 * Sources for credibility on the results page:
 *   - IPIP Big Five (extraversion construct)
 *   - Adam Grant, Psychological Science 2013 (ambivert advantage)
 *   - Cleveland Clinic — omnivert vs. ambivert
 *   - Cleveland Clinic / The Otherness Institute — otrovert
 *   - Rami Kaminski (2025), The Gift of Not Belonging
 */

export type VertType = 'introvert' | 'extrovert' | 'ambivert' | 'omnivert' | 'otrovert';

export interface TypeDescription {
	type: VertType;
	headline: string;
	body: string;
}

export const descriptions: Record<VertType, TypeDescription> = {
	introvert: {
		type: 'introvert',
		headline: "You're not antisocial — you're battery-operated.",
		body: 'People aren\'t your problem. Recovery time is your fuel. You can absolutely show up, charm a room, hold court at a dinner — but every hour spent doing it costs you, and you need the math to balance. Most "introverts" online are actually shy or anxious. You\'re neither. You just have a meter, and you respect it.'
	},

	extrovert: {
		type: 'extrovert',
		headline: 'Other people are your espresso.',
		body: "You think out loud. Solitude isn't peaceful — it's static. The energy in a crowded room is how you find your edges. A quiet weekend with no plans gives you a vague itch that gets cured by a noisy dinner. People aren't input you process; they're the field you play on."
	},

	ambivert: {
		type: 'ambivert',
		headline: "You don't have a default setting — you have a dial.",
		body: "You're the one nobody can guess at the party. At the team dinner you're loud; at the work mixer you're listening; at a family event you're somehow both. Your trick isn't being in the middle — it's reading the room and becoming the answer. Adam Grant's sales research found ambiverts often outperform pure types in roles that need both modes. You're not undecided. You're situational."
	},

	omnivert: {
		type: 'omnivert',
		headline: 'Two settings: full volume or off-grid.',
		body: "You're not balanced like an ambivert. You're a power switch, not a dial. One week you're hosting brunches and texting everyone; the next, your phone is in a drawer and you'd pay to be left alone. Both modes are completely you. Friends sometimes call this \"moody\" — wrong. It's a binary, not a mood. You just don't have a third gear."
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
		].join('\n\n')
	}
};
