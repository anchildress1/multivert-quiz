import type { Archetype } from './archetypes';

export interface DeepDescription {
	dayInTheLife: string;
	trueThings: readonly [string, string, string, string, string];
	giveaways: readonly [string, string, string];
	whatHelps: string;
	whatKillsYou: string;
	youllNeverAdmit: string;
}

export interface TypeDescription {
	headline: string;
	body: string;
	deep: DeepDescription;
}

export const descriptions: Readonly<Record<Archetype, TypeDescription>> = Object.freeze({
	introvert: {
		headline: "You're not antisocial—you're battery-operated.",
		body: "Liking people and having stamina for them are two different things. You can charm a room, hold court at a dinner, host the brunch—and still need the next day off the calendar. Being on burns charge; only silence refills it. Anxiety and shyness can ride along, but they're not what's draining you. You're a battery, and you've learned the cost.",
		deep: {
			dayInTheLife:
				"The silences you keep have to be earned; the rest of the day will spend them. Coffee, alone, with the kind of book you've already read. By dinner you've talked to three people too many—even if two of them were just baristas. You go to bed earlier than you said you would, lights already off, phone face-down. The day was good. You'd just like it to be over now, please.",
			trueThings: [
				"You have rehearsed apologies for plans you haven't been invited to yet.",
				"You've stayed in the bathroom an extra five minutes at parties just to be alone with the towel rack.",
				'You re-read books partly because you trust them not to talk back.',
				'The phrase "let\'s hop on a quick call" lands in your stomach like a mild administrative crime.',
				"You've felt closer to someone after they stopped talking than while they were talking."
			],
			giveaways: [
				'Your headphones are a permanent accessory, even indoors.',
				'You arrive at things on time and leave them ten minutes early; nobody can ever name when you slipped.',
				'You sit at the end of any table that has an end, and people who watch you stop noticing.'
			],
			whatHelps:
				'A whole afternoon nobody can reach you, and nobody is in the next room either. Not even a good one.',
			whatKillsYou: 'A "quick coffee" that you didn\'t budget four hours for.',
			youllNeverAdmit:
				"Your favorite version of yourself shows up after the door has closed behind everyone, and you'd like more of that one, please."
		}
	},

	extrovert: {
		headline: 'Other people are your espresso.',
		body: "You think out loud. Solitude isn't peaceful—it's static. The hum of a crowded room is where the volume comes back. A weekend with no plans gets itchy fast, and a noisy dinner is the only known cure. People aren't input you process; they're the field you play on.",
		deep: {
			dayInTheLife:
				"You wake up looking for the day to start, which to you means looking for someone. Coffee tastes wrong without a person across from it. By lunch you've passed three ideas through three different people, and one of them came back to you sharper than you sent it. You organized a follow-up dinner from scratch in a parking lot at 4 p.m., and seven people are coming. By the time you fall asleep you've absorbed seven moods, returned six, and the seventh is going to be tomorrow's whole personality.",
			trueThings: [
				"You think 'I should probably learn to be alone' the way other people think they should learn pottery—abstract, beautiful, and not this year.",
				'A meeting that becomes a hallway conversation that becomes a coffee is the actual point of the meeting.',
				"You've made a stranger laugh on purpose for sport.",
				"Voice notes don't intimidate you. Silence does.",
				"You've cried because nobody was free on a Sunday, and you'd cry for that reason again."
			],
			giveaways: [
				"You know the bartender's name within twenty minutes.",
				'You start the story before anyone asked for it.',
				"You finish strangers' sentences in coffee-shop lines and somehow get away with it."
			],
			whatHelps:
				'One more dinner, even though everyone in the chat already said no. Especially because they did.',
			whatKillsYou: 'A weekend where nothing was planned because you "needed rest." You did not.',
			youllNeverAdmit: "Your best thinking happens during someone else's monologue."
		}
	},

	ambivert: {
		headline: "You don't have a default setting—you have a dial.",
		body: "You're the one nobody can guess at the party. At the team dinner you're loud; at the work mixer you're listening; at a family event you're somehow both. Your trick isn't being in the middle—it's reading the room and turning the dial. You're not undecided. You're situational. The dial takes effort to turn—most people only have a switch.",
		deep: {
			dayInTheLife:
				"You start the day in low gear because that's what this one asks for—coffee, a long inbox, a low playlist. By lunch you're carrying a conversation through three jokes and a rebrand. You read the room at three meetings and become a slightly different person at each one, on purpose. You drop two registers between leaving work and unlocking your door, and stay there until one important text pulls you back up. Nobody, including you, could honestly say which version is the real one.",
			trueThings: [
				'"Are you an introvert or extrovert?" is a question you\'ve answered five different ways at five different jobs and meant all of them.',
				"You've matched a stranger's accent inside two sentences and not realized you were doing it until they laughed.",
				'You can hear a tone change in a voice over the phone before you can hear the words.',
				'You can be the funny one at one table and the listener at the next, served the same dinner.',
				"Your closest friends each describe you to other people, and you've heard four different descriptions back, and all four are accurate."
			],
			giveaways: [
				"Someone has called you an extrovert. Someone else has called you a real introvert. You didn't correct either.",
				"Your voice changes register slightly with the room—you don't notice it doing it.",
				'You read the room before you read the menu.'
			],
			whatHelps:
				"An afternoon where you don't have to be one specific person, just the one each hour wants. Coffee with one friend, a long walk alone, a noisy dinner—same day, none of them effortful.",
			whatKillsYou:
				'Being told you "haven\'t picked." You did. Repeatedly. They just didn\'t notice.',
			youllNeverAdmit:
				'The dial costs more than you let on. Some weeks, a switch sounds like a vacation.'
		}
	},

	omnivert: {
		headline: 'Two settings: full volume or off-grid.',
		body: "You're not balanced like an ambivert. You're a power switch, not a dial. One week you're hosting brunches and texting everyone; the next, your phone is in a drawer and you'd pay to be left alone. Both modes are completely you. Friends sometimes call this \"moody\"—wrong. It's a binary, not a mood. You just don't have a third gear.",
		deep: {
			dayInTheLife:
				"You wake up Monday and the world is a buffet and you are starving. You text everyone. You make four plans. You do all four. By Wednesday the plans are insulting the very fact of plans. You eat a sandwich standing in your kitchen with the lights off. By Sunday the phone is in another room—physically—and there is a candle on. People who saw you Tuesday think you're someone else by Sunday. They're right. You are.",
			trueThings: [
				'You have, in the same week, hosted a dinner and ghosted a brunch.',
				'Your texts arrive in clusters. Days of nothing, then forty-three at 11 p.m. on a Thursday with no preamble.',
				'You can flip the switch publicly—finish the wedding speech, take three more questions—and then crash so completely the bed becomes a country.',
				"You don't drift between modes. You teleport.",
				'You\'ve apologized for being "moody" your whole life when actually you were just being correctly calibrated to which week it was.'
			],
			giveaways: [
				'You either show up to everything or nothing—your friends learned to ask twice.',
				'A four-photo carousel of brunch on Saturday; phone untouched by Tuesday.',
				'Your last post is either today or last June, with no in-between.'
			],
			whatHelps:
				'A literal door, closed, for a literal weekend, with permission from no one. Then you come back loud.',
			whatKillsYou:
				"Being asked, while you're in the off-week, to explain the on-week. Or vice-versa.",
			youllNeverAdmit:
				"You actually like the swing. It's the part of you that means you've never been small."
		}
	},

	otrovert: {
		headline: 'Friendly to everyone. Member of nothing.',
		body: [
			"You can host the party, give the lecture, MC the show. But sign on as a regular member of anything? That's where it cracks. Clubs, teams, friend groups, fandoms—guest appearances, never regular cast.",
			'Friendships, on the other hand, are deep and one-on-one. There\'s no "social circle." There never was.',
			"Consensus doesn't move you, either. You examine ideas yourself before adopting them, you decline the urge to convince anyone else, and mass movements pass you by—including the ones you quietly agree with. Privacy isn't preference; it's posture. Even close friends only see the version you let through."
		].join('\n\n'),
		deep: {
			dayInTheLife:
				"You wake up early and feel slightly outside of the morning, which is fine—it's the angle from which you see best. You give the talk and it goes well; people thank you for being there; you wonder, kindly, whether you actually were. You meet one person for one hour, and that hour is the realest part of the week. The group chat fills up while you're cooking. You read every message. You don't reply. You haven't replied since 2019, actually, and nobody seems to mind, because you're warm in person and that turns out to be enough.",
			trueThings: [
				'"We" is a word other people use. You nod along, because the conversation is fine and the word isn\'t.',
				"You've belonged to clubs only as a guest of honor, never as a member.",
				'You can host a dinner for twelve and not, even once, feel like one of the twelve.',
				"You've quietly agreed with the cause and quietly declined to wear the t-shirt.",
				'The deepest friendships of your life have been one person at a time, with no overlapping witnesses.'
			],
			giveaways: [
				"Strangers ask you for directions in cities you don't live in, and you do your best.",
				'In any group chat over six people, your entire participation is a heart react.',
				"Acquaintances call you private; close friends know you're not, you just don't repeat yourself."
			],
			whatHelps:
				"A real two-hour conversation with one person you don't see often enough. Not a phone call. In a kitchen.",
			whatKillsYou: 'Anything that calls itself a "community" and means a Slack workspace.',
			youllNeverAdmit:
				"Belonging would have been easier. You just couldn't make yourself want it the cheap way."
		}
	}
});
