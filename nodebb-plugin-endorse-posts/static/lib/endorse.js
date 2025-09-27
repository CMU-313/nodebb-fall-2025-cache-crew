/* global $, app, ajaxify */
'use strict';

// --- helpers ---------------------------------------------------------------

function isStaff() {
  // Cover all bases: runtime flags + body classes (Harmony sets these)
  const byUser = !!(app?.user && (app.user.isAdmin || app.user.isGlobalModerator));
  const byBody = $('body').hasClass('admin') || $('body').hasClass('global-mod');
  return byUser || byBody;
}

function getPostsFromPayload(payload) {
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(ajaxify?.data?.posts)) return ajaxify.data.posts;
  return [];
}

function upsertBadge($post, on) {
  let $badge = $post.find('.endorse-badge');
  if (!$badge.length) {
    $badge = $('<span class="endorse-badge">Endorsed</span>');
    const $anchor = $post.find('.post-header, .content').first();
    $anchor.prepend($badge);
  }
  $badge.toggleClass('is-on', on).toggle(on);
}

// --- UI injection ----------------------------------------------------------

function injectIntoDropdown($post, pid, isOn) {
  // Harmony dropdown
  const $menu = $post.find('[component="post/tools"] .dropdown-menu');
  if (!$menu.length) return false; // not available yet

  let $item = $menu.find('.endorse-toggle');
  if (!$item.length) {
    $menu.append('<div class="dropdown-divider"></div>');
    $item = $('<a class="dropdown-item endorse-toggle" href="#"></a>').appendTo($menu);
    $item.on('click', function (e) {
      e.preventDefault();
      toggle(pid, $post);
      // close the dropdown
      $menu.closest('.dropdown').removeClass('show')
        .find('.dropdown-menu').removeClass('show');
    });
  }
  $item.text(isOn ? 'Un-endorse' : 'Endorse');
  return true;
}

function injectInlineCta($post, pid, isOn) {
  // Fallback host: post actions row → tools → footer → content
  const $host = $post.find('[component="post/actions"], .post-tools, .post-footer, .content').first();
  if (!$host.length) return false;

  let $btn = $post.find('.endorse-inline');
  if (!$btn.length) {
    $btn = $('<a class="endorse-inline" href="#" style="margin-left:8px;"></a>').appendTo($host);
    $btn.on('click', function (e) {
      e.preventDefault();
      toggle(pid, $post);
    });
  }
  $btn.text(isOn ? 'Un-endorse' : 'Endorse');
  return true;
}

async function toggle(pid, $post) {
  const on = $post.find('.endorse-badge').is(':visible');
  const method = on ? 'DELETE' : 'POST';
  try {
    await $.ajax({ url: `${app.config.relative_path}/api/v3/posts/${pid}/endorse`, method });
    upsertBadge($post, !on);
    $post.find('.endorse-toggle,.endorse-inline').text(!on ? 'Un-endorse' : 'Endorse');
    app.alertSuccess(!on ? 'Post endorsed.' : 'Endorsement removed.');
  } catch (err) {
    app.alertError(err?.responseJSON?.error || 'Failed to toggle endorsement');
  }
}

function wire(payload) {
  if (!isStaff()) return;
  const posts = getPostsFromPayload(payload);
  posts.forEach((p) => {
    const $post = $(`[data-pid="${p.pid}"]`);
    if (!$post.length) return;

    upsertBadge($post, !!p.isEndorsed);

    // Try dropdown first; if not present yet, add inline CTA as fallback
    const dropdownOK = injectIntoDropdown($post, p.pid, !!p.isEndorsed);
    if (!dropdownOK) injectInlineCta($post, p.pid, !!p.isEndorsed);
  });
}

// initial load + incremental loads
$(window).on('action:topic.loaded', (_e, data) => wire(data));
$(window).on('action:posts.loaded', (_e, data) => wire(data));

// If the dropdown renders lazily when opened, enhance it on open:
$(document).on('shown.bs.dropdown', '[component="post/tools"]', function () {
  if (!isStaff()) return;
  const $post = $(this).closest('[data-pid]');
  const pid = parseInt($post.attr('data-pid'), 10);
  const isOn = $post.find('.endorse-badge').is(':visible');
  injectIntoDropdown($post, pid, isOn);
});
