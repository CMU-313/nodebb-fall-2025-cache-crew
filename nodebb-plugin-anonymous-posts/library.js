'use strict';

const plugin = {};

plugin.addAnonField = async (data) => {
  // Ensure the new field exists
  data.post.is_anonymous = data.post.is_anonymous || false;
  return data;
};

module.exports = plugin;