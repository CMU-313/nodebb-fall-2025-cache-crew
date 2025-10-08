"use strict";

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const groups = require.main.require('./src/groups');

const plugin = {};

// Simple fallback-only search: scans recent topics' titles and main post content.
// This doesn't rely on any indexed search backend and will work in dev.
plugin.addRoutes = function (params, callback) {
  const { router } = params;

  console.log('[Custom Search] Adding API routes (fallback-only)');

  router.get('/api/custom-search', async (req, res) => {
    try {
      const { term, in: inParam } = req.query;
      if (!term || String(term).trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      const searchTerm = String(term).trim().toLowerCase();

      // Optional category filter like `category:2` or just `2`
      let filterCid = null;
      if (inParam) {
        const m = String(inParam).match(/category:(\d+)/);
        if (m) filterCid = parseInt(m[1], 10);
        else if (/^\d+$/.test(String(inParam).trim())) filterCid = parseInt(inParam, 10);
      }

      // Get an admin uid so we can bypass permission filters and see all content for the search
      const adminUids = await groups.getMembers('administrators', 0, 1);
      const adminUid = (adminUids && adminUids.length) ? adminUids[0] : 1;

      // Limit scanning to avoid heavy loads
      const MAX_TOPICS = 1000; // tweakable

      // Fetch recent topic ids (topics:tid is the canonical set of all topics ordered by tid)
      const tids = await db.getSortedSetRevRange('topics:tid', 0, MAX_TOPICS - 1);
      if (!Array.isArray(tids) || tids.length === 0) {
        return res.json({ results: [], matchCount: 0, note: 'No topics found to scan' });
      }

      // Load topics data as admin so we get titles and mainPid
      const topicsData = await topics.getTopicsByTids(tids, { uid: adminUid });

  const pidsToCheck = [];
      const matchedPids = [];
  const tidsToScanReplies = [];

      for (const t of topicsData) {
        if (!t) continue;
        if (filterCid && t.cid !== filterCid) continue;

        // Check title
        if (t.title && String(t.title).toLowerCase().includes(searchTerm)) {
          if (t.mainPid) matchedPids.push(t.mainPid);
          continue;
        }

        // otherwise schedule main post content for checking
        if (t.mainPid) pidsToCheck.push(t.mainPid);

        // schedule scanning recent replies for this topic as well (limited per topic)
        tidsToScanReplies.push(t.tid);
      }

      // Load the main posts' content in batches
      const BATCH = 200;
      for (let i = 0; i < pidsToCheck.length; i += BATCH) {
        const batch = pidsToCheck.slice(i, i + BATCH);
        const postsFields = await posts.getPostsFields(batch, ['pid', 'content', 'sourceContent']);
        for (const pf of postsFields) {
          if (!pf) continue;
          const content = (pf.sourceContent || pf.content || '').toString().toLowerCase();
          if (content.includes(searchTerm)) matchedPids.push(pf.pid);
        }
      }

      // Also scan recent replies for each topic (limited) — avoid scanning too many replies
      const MAX_REPLIES_PER_TOPIC = 5;
      const replyPids = [];
      for (let j = 0; j < tidsToScanReplies.length; j++) {
        const tid = tidsToScanReplies[j];
        try {
          const recentPids = await db.getSortedSetRevRange(`tid:${tid}:posts`, 0, MAX_REPLIES_PER_TOPIC - 1);
          if (Array.isArray(recentPids) && recentPids.length) {
            // exclude mainPid duplicates later when deduping
            replyPids.push(...recentPids.map(pid => parseInt(pid, 10)));
          }
        } catch (e) {
          // ignore per-topic failures
          console.warn('[Custom Search] failed to load replies for tid', tid, e.message || e);
        }
      }

      // Check reply post contents in batches
      const allReplyPids = Array.from(new Set(replyPids));
      for (let i = 0; i < allReplyPids.length; i += BATCH) {
        const batch = allReplyPids.slice(i, i + BATCH);
        const postsFields = await posts.getPostsFields(batch, ['pid', 'content', 'sourceContent']);
        for (const pf of postsFields) {
          if (!pf) continue;
          const content = (pf.sourceContent || pf.content || '').toString().toLowerCase();
          if (content.includes(searchTerm)) matchedPids.push(pf.pid);
        }
      }

      // Deduplicate and limit results
  const uniquePids = Array.from(new Set(matchedPids)).slice(0, 50);

      const summaries = uniquePids.length ? await posts.getPostSummaryByPids(uniquePids, adminUid, { stripTags: false }) : [];

      return res.json({ results: summaries, matchCount: uniquePids.length, searchedFor: term });
    } catch (err) {
      console.error('[Custom Search] fallback error', err);
      return res.status(500).json({ error: 'Fallback search failed', details: err.message });
    }
  });

  // Basic info endpoint to help pick search terms
  router.get('/api/custom-search/info', async (req, res) => {
    try {
  const totalTopics = await topics.getTopicsCount();
      const adminUids = await groups.getMembers('administrators', 0, 1);
      const adminUid = (adminUids && adminUids.length) ? adminUids[0] : 1;

      // sample recent topic titles
      const sampleTids = await db.getSortedSetRevRange('topics:tid', 0, 9);
      const sampleTopics = await topics.getTopicsByTids(sampleTids, { uid: adminUid });
      const sampleTitles = sampleTopics.filter(Boolean).map(t => ({ tid: t.tid, title: t.title, cid: t.cid }));

      res.json({ totalTopics, sampleTitles, note: 'Use a term from sampleTitles to test /api/custom-search?term=...' });
    } catch (err) {
      console.error('[Custom Search Info] error', err);
      res.status(500).json({ error: err.message });
    }
  });

  callback();
};

plugin.init = function (params, callback) {
  console.log('[Custom Search] Plugin initialized (fallback-only)');
  callback();
};

module.exports = plugin;