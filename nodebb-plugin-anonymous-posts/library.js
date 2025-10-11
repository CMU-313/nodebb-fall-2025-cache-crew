'use strict';

const plugin = {};

// Add the "is_anonymous" field to the post data
plugin.addAnonField = async (data) => {
  // Get the "is_anonymous" field from the post data or the submission data
  const isAnonymous = typeof data?.data?.is_anonymous !== 'undefined' ? data.data.is_anonymous : data?.post?.is_anonymous;
  data.post.is_anonymous = Boolean(isAnonymous);
  return data;
};

module.exports = plugin;
