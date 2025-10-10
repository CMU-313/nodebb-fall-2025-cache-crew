'use strict';

const posts = require.main.require('./src/posts');
const db = require.main.require('./src/database');
const user = require.main.require('./src/user');            // NEW: to check roles

const Endorse = {};

// --- helpers ---
async function assertStaff(uid) {
  if (!uid) return false;
  const [isAdmin, isGM] = await Promise.all([
    user.isAdministrator(uid),
    user.isGlobalModerator(uid),
  ]);
  return isAdmin || isGM;
}

// expose boolean on single post payloads
Endorse.decoratePost = async (hookData) => {
  const p = hookData?.post;
  if (!p?.pid) return hookData;
  const v = await db.getObjectField(`post:${p.pid}`, 'isEndorsed');
  p.isEndorsed = v === '1';
  return hookData;
};

// expose boolean on arrays of posts
Endorse.decoratePosts = async (hookData) => {
  const arr = hookData?.posts;
  if (!Array.isArray(arr) || !arr.length) return hookData;
  const vals = await Promise.all(arr.map(p => db.getObjectField(`post:${p.pid}`, 'isEndorsed')));
  arr.forEach((p, i) => { p.isEndorsed = vals[i] === '1'; });
  return hookData;
};

Endorse.init = async ({ router }) => {
  // One handler body, mounted at two paths: /api/... and /api/v3/...
  async function endo
