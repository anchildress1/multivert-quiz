import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './version';

describe('APP_VERSION', () => {
	it('is a non-empty string', () => {
		expect(typeof APP_VERSION).toBe('string');
		expect(APP_VERSION.length).toBeGreaterThan(0);
	});

	it('has a leading v + dotted version segment that the footer can render', () => {
		// The footer pins this string into the layout. Format slipping (no
		// leading `v`, missing dotted version, surrounding whitespace) is the
		// kind of regression that only catches a reader's eye.
		expect(APP_VERSION).toMatch(/^v\d+\.\d+/);
		expect(APP_VERSION.trim()).toBe(APP_VERSION);
	});
});
