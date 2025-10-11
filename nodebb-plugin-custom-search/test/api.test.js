const assert = require('assert');

describe('nodebb-plugin-custom-search API', function () {
	this.timeout(10000);

	const base = 'http://localhost:4567';

	before(async function () {
		// Quick reachability check; skip tests if NodeBB isn't running locally
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2000);
		try {
			await fetch(base + '/', { signal: controller.signal });
			clearTimeout(timeout);
		} catch (e) {
			console.warn('NodeBB not reachable at', base, '- skipping integration tests');
			this.skip();
		}
	});

	it('should return 400 when term is not provided', async function () {
		const res = await fetch(`${base}/api/custom-search`);
		assert.strictEqual(res.status, 400);
		const body = await res.json();
		assert.ok(body.error, 'expected error message');
	});

	it('should return results and snippets for a valid term', async function () {
		const term = 'test';
		const res = await fetch(`${base}/api/custom-search?term=${encodeURIComponent(term)}&asAdmin=1`);
		assert.strictEqual(res.status, 200);
		const body = await res.json();
		assert.ok(Array.isArray(body.results), 'results must be an array');
		if (body.results.length > 0) {
			for (const r of body.results) {
				assert.ok(typeof r.pid !== 'undefined');
				// snippet property should exist (may be null)
				assert.ok('snippet' in r);
				if (r.snippet !== null) {
					assert.strictEqual(typeof r.snippet, 'string');
				}
			}
		}
	});
});
