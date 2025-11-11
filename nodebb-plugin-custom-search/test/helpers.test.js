const assert = require('assert');
const { stripHtml, buildSnippet, findMatchingPidsFromPosts } = require('../lib/helpers');

describe('custom-search helpers', function () {
	describe('stripHtml', function () {
		it('removes html tags', function () {
			const html = '<p>Hello <strong>World</strong>!</p>';
			const out = stripHtml(html);
			assert.ok(out.includes('Hello'));
			assert.ok(out.includes('World'));
		});
	});

	describe('buildSnippet', function () {
		it('returns null when no tokens present', function () {
			const out = buildSnippet('this is some text', []);
			assert.strictEqual(out, null);
		});

		it('finds token and returns context with ellipses when truncated', function () {
			const text = 'a'.repeat(500) + ' hello match me in the middle ' + 'b'.repeat(500);
			const out = buildSnippet(text, ['match']);
			assert.ok(out.includes('match'));
			assert.ok(out.startsWith('...') || out.endsWith('...'));
		});

		it('returns null when token not found', function () {
			const out = buildSnippet('short content', ['notfound']);
			assert.strictEqual(out, null);
		});
	});

	describe('findMatchingPidsFromPosts', function () {
		it('returns matching pids only', function () {
			const posts = [
				{ pid: 1, content: 'hello world' },
				{ pid: 2, content: 'no match here' },
				{ pid: 3, sourceContent: 'another hello' }
			];
			const out = findMatchingPidsFromPosts(posts, 'hello');
			assert.deepStrictEqual(out.sort(), [1, 3]);
		});
	});
});
