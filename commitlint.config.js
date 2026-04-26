/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	plugins: ['@checkmarkdevtools/commitlint-plugin-rai'],
	rules: {
		'rai-footer-exists': [2, 'always']
	}
};
