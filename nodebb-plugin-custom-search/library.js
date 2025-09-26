'use strict';

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const categories = require.main.require('./src/categories');
const user = require.main.require('./src/user');
const privileges = require.main.require('./src/privileges');

const plugin = {};

// This is the correct way to add API routes in NodeBB
plugin.addRoutes = function(params, callback) {
  const { router, middleware, helpers } = params;
  
  console.log('[Custom Search] Adding API routes...');
  
  // Register the API route - note the function signature
  router.get('/api/custom-search', function(req, res) {
    console.log('[Custom Search] API endpoint hit with query:', req.query);
    
    const { term, in: category } = req.query;
    
    if (!term || term.trim().length === 0) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // For now, return a simple test response
    res.json({
      results: [
        {
          type: 'test',
          topic: {
            tid: 1,
            title: `Test Result for: ${term}`,
            slug: 'test-result-' + term.toLowerCase().replace(/\s+/g, '-')
          },
          post: {
            content: `This is a test search result for "${term}" in category "${category || 'all'}"`,
            pid: null
          },
          user: {
            username: 'TestUser'
          },
          score: 100
        }
      ],
      matchCount: 1,
      debug: {
        searchTerm: term,
        category: category,
        timestamp: Date.now()
      }
    });
  });
  
  callback();
};

plugin.init = function(params, callback) {
  console.log('[Custom Search] Plugin initialized');
  callback();
};

module.exports = plugin;