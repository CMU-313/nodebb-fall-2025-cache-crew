'use strict';

const plugin = {};

// Add the "is_anonymous" field to the post data when absent
plugin.addAnonField = async (data) => {
  const existing = typeof data?.post?.is_anonymous !== 'undefined' ? data.post.is_anonymous : data?.data?.is_anonymous;

  if (typeof existing === 'undefined') {
    data.post.is_anonymous = 0;
    return data;
  }

  const normalized = normalizeFlag(existing);
  data.post.is_anonymous = normalized;
  if (data.data) {
    data.data.is_anonymous = normalized;
  }
  return data;
};

function normalizeFlag(value) {
  if (typeof value === 'number') {
    return value ? 1 : 0;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return 1;
    }
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
      return 0;
    }
  }
  throw new Error('[[error:invalid-data]]');
}

module.exports = plugin;
