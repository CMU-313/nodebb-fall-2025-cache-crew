// test/endorse.api.spec.js
'use strict';

const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

// --- Mocks for require.main.require ---
const dbMock = {
setObjectField: sinon.stub().resolves(),
deleteObjectField: sinon.stub().resolves(),
getObjectField: sinon.stub().resolves(null),
};
const postsMock = {
    getPostData: sinon.stub().callsFake(async (pid) => (pid ? { pid } : null)),
};
const userMock = {
    isAdministrator: sinon.stub().resolves(true),
    isGlobalModerator: sinon.stub().resolves(false),
};

// redirect `require.main.require` lookups used in library.js
const lib = proxyquire('../nodebb-plugin-endorse-posts/library.js', {
  // library.js does require.main.require('./src/...'), so intercept by path key
  [require.main ? './src/database' : '']: dbMock,
  [require.main ? './src/posts' : '']: postsMock,
  [require.main ? './src/user' : '']: userMock,
});
// NOTE: When proxyquiring with require.main.require, Node resolves the keys
// off the current "main". The trick above works under Mocha since this file
// is the entrypoint; Node treats this module as main for the test process.

describe('Endorse API routes', function () {
  let app;

  beforeEach(async function () {
    // fresh stubs each test
    dbMock.setObjectField.resetHistory();
    dbMock.deleteObjectField.resetHistory();
    postsMock.getPostData.resetHistory();
    userMock.isAdministrator.resetBehavior();
    userMock.isAdministrator.resolves(true);
    userMock.isGlobalModerator.resetBehavior();
    userMock.isGlobalModerator.resolves(false);

    app = express();
    // emulate NodeBB setting req.uid on authenticated requests
    app.use((req, _res, next) => { req.uid = 1; next(); });

    const router = express.Router();
    await lib.init({ router });   // mount our plugin routes on this router
    app.use(router);
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
