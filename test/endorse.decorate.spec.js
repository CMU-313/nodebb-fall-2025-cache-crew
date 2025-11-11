// test/endorse.decorate.spec.js
'use strict';

const sinon = require('sinon');
const { expect } = require('chai');

describe('Decorators (filter:post.get / filter:posts.get)', function () {
	let dbMock;
	let postsMock;
	let userMock;
	let restoreMainRequire;
	let lib;

	beforeEach(function () {
		dbMock = { getObjectField: sinon.stub() };
		postsMock = {};
		userMock = {};

		const original = require.main && require.main.require;
		restoreMainRequire = function () {
			if (require.main) {
				require.main.require = original;
			}
		};
		if (require.main) {
			require.main.require = function (p) {
				if (p === './src/database') { return dbMock; }
				if (p === './src/posts') { return postsMock; }
				if (p === './src/user') { return userMock; }
				return require(p);
			};
		}

		lib = require('../nodebb-plugin-endorse-posts/library.js');
	});

	afterEach(function () {
		delete require.cache[require.resolve('../nodebb-plugin-endorse-posts/library.js')];
		if (restoreMainRequire) { restoreMainRequire(); }
	});

	it('decoratePost sets post.isEndorsed = true when db value is "1"', async function () {
		dbMock.getObjectField.resolves('1');
		const hookData = { post: { pid: 5 } };
		const out = await lib.decoratePost(hookData);
		expect(out.post.isEndorsed).to.equal(true);
		expect(dbMock.getObjectField.calledOnceWithExactly('post:5', 'isEndorsed')).to.equal(true);
	});

	it('decoratePost sets post.isEndorsed = false when db value is not "1"', async function () {
		dbMock.getObjectField.resolves(null);
		const out = await lib.decoratePost({ post: { pid: 6 } });
		expect(out.post.isEndorsed).to.equal(false);
	});

	it('decoratePosts maps array of posts', async function () {
		dbMock.getObjectField.onCall(0).resolves('1');
		dbMock.getObjectField.onCall(1).resolves(null);

		const hookData = { posts: [{ pid: 10 }, { pid: 11 }] };
		const out = await lib.decoratePosts(hookData);

		expect(out.posts[0].isEndorsed).to.equal(true);
		expect(out.posts[1].isEndorsed).to.equal(false);
		expect(dbMock.getObjectField.calledTwice).to.equal(true);
	});

	it('decoratePosts is a no-op for empty arrays', async function () {
		const out = await lib.decoratePosts({ posts: [] });
		expect(out.posts).to.deep.equal([]);
		expect(dbMock.getObjectField.called).to.equal(false);
	});
});
