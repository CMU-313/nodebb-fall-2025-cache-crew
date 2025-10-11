'use strict';

const assert = require('assert');

const helpers = require('../helpers');
const db = require('../mocks/databasemock');
const user = require('../../src/user');
const groups = require('../../src/groups');
const categories = require('../../src/categories');

// Used some ChatGPT-5 to help with the code for this test
describe('Topics anonymous flag', () => {
	const credentials = { username: 'anon-test-user', password: 'anonymous123' };
	let jar;
	let category;
	let topicTid;
	let mainPid;

	before(async () => {
		const uid = await user.create(credentials);
		await groups.join('administrators', uid);
		({ jar } = await helpers.loginUser(credentials.username, credentials.password));
		category = await categories.create({
			name: 'Anonymous Test Category',
			description: 'Category used for anonymous post tests',
		});
	});

	it('should persist is_anonymous on topic creation and edit', async () => {
		const result = await helpers.request('post', `/api/v3/topics`, {
			jar,
			body: {
				cid: category.cid,
				title: 'Anonymous topic',
				content: 'Hello from anonymous topic',
				is_anonymous: true,
			},
		});

		assert.strictEqual(result.response.statusCode, 200);
		const topic = result.body.response;
		topicTid = topic.tid;
		mainPid = topic.mainPid;

		const postResult = await helpers.request('get', `/api/v3/posts/${mainPid}`, { jar });
		assert.strictEqual(postResult.response.statusCode, 200);
		assert.strictEqual(postResult.body.response.is_anonymous, true);

		const redisValue = await db.getObjectField(`post:${mainPid}`, 'is_anonymous');
		assert.strictEqual(redisValue, '1');

		const editResult = await helpers.request('put', `/api/v3/posts/${mainPid}`, {
			jar,
			body: {
				content: 'Editing anonymous flag',
				is_anonymous: false,
			},
		});

		assert.strictEqual(editResult.response.statusCode, 200);
		assert.strictEqual(editResult.body.response.is_anonymous, false);

		const redisAfterEdit = await db.getObjectField(`post:${mainPid}`, 'is_anonymous');
		assert.strictEqual(redisAfterEdit, '0');
	});

	it('should persist is_anonymous on replies', async () => {
		const replyResult = await helpers.request('post', `/api/v3/topics/${topicTid}`, {
			jar,
			body: {
				content: 'Anonymous reply',
				is_anonymous: true,
			},
		});

		assert.strictEqual(replyResult.response.statusCode, 200);
		const reply = replyResult.body.response;
		assert.strictEqual(reply.is_anonymous, true);

		const redisValue = await db.getObjectField(`post:${reply.pid}`, 'is_anonymous');
		assert.strictEqual(redisValue, '1');
	});
});
