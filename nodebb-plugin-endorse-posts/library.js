'use strict';

const posts = require.main.require('./src/posts');
const db = require.main.require('./src/database');

const Endorse = {};

// Decorate each post payload with boolean isEndorsed (missing => false)
Endorse.decoratePosts = async (hookData) => {
  const arr = hookData?.posts;
  if (!Array.isArray(arr) || !arr.length) return hookData;
  const vals = await Promise.all(arr.map(p => db.getObjectField(`post:${p.pid}`, 'isEndorsed')));
  arr.forEach((p, i) => { p.isEndorsed = vals[i] === '1'; });
  return hookData;
};


// Minimal REST API (admins or global mods only, to keep scope simple)
Endorse.init = async ({ router, middleware }) => {
  const requireStaff = [middleware.ensureLoggedIn, middleware.adminOrGlobalMod];

  router.post('/api/v3/posts/:pid/endorse', requireStaff, async (req, res, next) => {
    try {
      const pid = parseInt(req.params.pid, 10);
      const post = await posts.getPostData(pid);
      if (!post?.pid) return res.status(404).json({ error: 'post-not-found' });

      await db.setObjectField(`post:${pid}`, 'isEndorsed', '1');
      res.json({ pid, isEndorsed: true });
    } catch (err) { next(err); }
  });

  router.delete('/api/v3/posts/:pid/endorse', requireStaff, async (req, res, next) => {
    try {
      const pid = parseInt(req.params.pid, 10);
      const post = await posts.getPostData(pid);
      if (!post?.pid) return res.status(404).json({ error: 'post-not-found' });

      await db.deleteObjectField(`post:${pid}`, 'isEndorsed');
      res.json({ pid, isEndorsed: false });
    } catch (err) { next(err); }
  });
};

module.exports = Endorse;
