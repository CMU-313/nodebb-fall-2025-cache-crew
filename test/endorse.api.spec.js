// test/endorse.api.spec.js
'use strict';

const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');

describe('Endorse API routes', function () {
	let app;
	let dbMock;
	let postsMock;
	let userMock;
	let restoreMainRequire;
	let lib;

	beforeEach(async function () {
		// fresh mocks
		dbMock = {
			setObjectField: sinon.stub().resolves(),
			deleteObjectField: sinon.stub().resolves(),
			getObjectField: sinon.stub().resolves(null),
		};
		postsMock = {
			getPostData: sinon.stub().callsFake(async (pid) => (pid ? { pid: pid } : null)),
		};
		userMock = {
			isAdministrator: sinon.stub().resolves(true),
			isGlobalModerator: sinon.stub().resolves(false),
		};

		// monkey-patch require.main.require
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

		// load plugin after patch
		lib = require('../nodebb-plugin-endorse-posts/library.js');

		app = express();
		// emulate NodeBB attaching uid
		app.use(function (req, _res, next) {
			req.uid = 1;
			next();
		});

		const router = express.Router();
		await lib.init({ router: router });
		app.use(router);
	});

	afterEach(function () {
		// cleanup module cache and restore
		delete require.cache[require.resolve('../nodebb-plugin-endorse-posts/library.js')];
		if (restoreMainRequire) { restoreMainRequire(); }
	});

	it('POST /api/v3/posts/:pid/endorse endorses when staff', async function () {
		const res = await request(app)
			.post('/api/v3/posts/42/endorse')
			.expect(200);

		expect(res.body).to.deep.equal({ pid: 42, isEndorsed: true });
		expect(dbMock.setObjectField.calledOnceWithExactly('post:42', 'isEndorsed', '1')).to.equal(true);
	});

	it('DELETE /api/v3/posts/:pid/endorse un-endorses when staff', async function () {
		const res = await request(app)
			.delete('/api/v3/posts/42/endorse')
			.expect(200);

		expect(res.body).to.deep.equal({ pid: 42, isEndorsed: false });
		expect(dbMock.deleteObjectField.calledOnceWithExactly('post:42', 'isEndorsed')).to.equal(true);
	});

	it('returns 403 for non-staff', async function () {
		userMock.isAdministrator.resolves(false);
		userMock.isGlobalModerator.resolves(false);

		await request(app)
			.post('/api/v3/posts/1/endorse')
			.expect(403);
	});

	it('returns 404 for unknown post', async function () {
		postsMock.getPostData.callsFake(async () => null);

		await request(app)
			.post('/api/v3/posts/9999/endorse')
			.expect(404);
	});

	it('routes also mounted under /api', async function () {
		await request(app)
			.post('/api/posts/7/endorse')
			.expect(200);

		await request(app)
			.delete('/api/posts/7/endorse')
			.expect(200);
	});
});
