'use strict';

const posts = require.main.require('./src/posts');
const db = require.main.require('./src/database');
const user = require.main.require('./src/user');

const Endorse = {};

// helpers
async function assertStaff(uid) {
	if (!uid) { return false; }
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) { return true; }
	const isGM = await user.isGlobalModerator(uid);
	return !!isGM;
}

// expose boolean on single post payloads
Endorse.decoratePost = async (hookData) => {
	const p = hookData && hookData.post;
	if (!p || !p.pid) { return hookData; }
	const v = await db.getObjectField('post:' + p.pid, 'isEndorsed');
	p.isEndorsed = (v === '1');
	return hookData;
};

// expose boolean on arrays of posts
Endorse.decoratePosts = async (hookData) => {
	const arr = hookData && hookData.posts;
	if (!Array.isArray(arr) || !arr.length) { return hookData; }
	const vals = await Promise.all(arr.map(function (p) {
		return db.getObjectField('post:' + p.pid, 'isEndorsed');
	}));
	arr.forEach(function (p, i) {
		p.isEndorsed = (vals[i] === '1');
	});
	return hookData;
};

Endorse.init = async function (params) {
	const router = params.router;

	async function endorseHandler(req, res) {
		const uid = req.uid;
		const ok = await assertStaff(uid);
		if (!ok) {
			return res.status(403).json({ error: 'forbidden' });
		}

		const pid = parseInt(req.params.pid, 10);
		const post = await posts.getPostData(pid);
		if (!post || !post.pid) {
			return res.status(404).json({ error: 'post-not-found' });
		}

		if (req.method === 'POST') {
			await db.setObjectField('post:' + pid, 'isEndorsed', '1');
			return res.json({ pid: pid, isEndorsed: true });
		}

		await db.deleteObjectField('post:' + pid, 'isEndorsed');
		return res.json({ pid: pid, isEndorsed: false });
	}

	// mount on both /api and /api/v3
	router.post('/api/posts/:pid/endorse', endorseHandler);
	router.delete('/api/posts/:pid/endorse', endorseHandler);
	router.post('/api/v3/posts/:pid/endorse', endorseHandler);
	router.delete('/api/v3/posts/:pid/endorse', endorseHandler);
};

module.exports = Endorse;
