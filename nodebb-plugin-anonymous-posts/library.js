'use strict';

const plugin = {};

plugin.addAnonField = async (data) => {
  const isAnonymous = typeof data?.data?.is_anonymous !== 'undefined' ? data.data.is_anonymous : data?.post?.is_anonymous;
  data.post.is_anonymous = Boolean(isAnonymous);
  return data;
};

module.exports = plugin;
