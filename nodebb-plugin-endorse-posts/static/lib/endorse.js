/* global $, app, ajaxify */
'use strict';

/**
 * Harmony-safe UI:
 * - Adds Endorse/Un-endorse to the post tools dropdown (…)
 * - Adds an inline fallback CTA near post actions if dropdown not present
 * - Shows an "Endorsed" pill and toggles a post-level highlight class
 */

// -------- helpers ----------
function isStaff() {
  const byUser = !!(app?.user && (app.user.isAdmin || app.user.isGlobalModerator));
  const byBody = $('body').hasClass('admin') || $('body').hasClass('global-mod');
  return byUser || byBody;
}

function getPosts(payload) {
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(ajaxify?.data?.posts)) return ajaxify.data.posts;
  return [];
}

function setPostEndorsedClass($post, on) {
  $post.toggleClass('endorsed', on);
}

function upsertBadge($post, on) {
  let $b = $post.find('.endorse-badge');
  if (!$b.length) {
    $b = $('<span class="endorse-badge" aria-label="Endorsed">Endorsed</span>');
    // Prefer header area; fall back to content
    $post.find('.post-header, .content').first().prepend($b);
  }
  $b.toggleClass('is-on', on).toggle(on);
  setPostEndorsedClass($post, on);   // <-- ensure container highlight toggles too
}

// -------- DOM targets ----------
function findDropdownMenu($post) {
  return $post.find(
    '[component="post/tools"] .dropdown-menu,' +
    '[component="post/menu"] .dropdown-menu,' +
    '.post-tools .dropdown-menu,' +
    '.dropdown-menu[role="menu"]'
  ).first();
}

function findInlineHost($post) {
  return $post.find(
    '[component="post/actions"],' +
    '[component="post/footer"],' +
    '.post-tools,' +
    '.post-footer,' +
    '.content'
  ).first();
}

// -------- UI injection ----------
function injectIntoDropdown($post, pid, isOn) {
  const $menu = findDropdownMenu($post);
  if (!$menu.length) return false;

  let $item = $menu.find('.endorse-toggle');
  if (!$item.length) {
    if (!$menu.find('.endorse-divider').length) {
      $('<div class="dropdown-divider endorse-divider"></div>').appendTo($menu);
    }
    $item = $('<a class="dropdown-item endorse-toggle" href="#"></a>').appendTo($menu);
    $item.on('click', (e) => {
      e.preventDefault();
      toggle(pid, $post);
      $menu.closest('.dropdown').removeClass('show').find('.dropdown-menu').removeClass('show');
    });
  }
  $item.text(isOn ? 'Un-endorse' : 'Endorse');
  return true;
}

function injectInlineCTA($post, pid, isOn) {
  const $host = findInlineHost($post);
  if (!$host.length) return false;

  let $btn = $post.find('.endorse-inline');
  if (!$btn.length) {
    $btn = $('<a class="endorse-inline" href="#" style="margin-left:8px;"></a>').appendTo($host);
    $btn.on('click', (e) => { e.preventDefault(); toggle(pid, $post); });
  }
  $btn.text(isOn ? 'Un-endorse' : 'Endorse');
  return true;
}

// -------- toggle ----------
async function toggle(pid, $post) {
  const on = $post.find('.endorse-badge').is(':visible');
  const method = on ? 'DELETE' : 'POST';
  const base = app.config.relative_path || '';
  try {
    await $.ajax({ url: `${base}/api/v3/posts/${pid}/endorse`, method });
    upsertBadge($post, !on);
    $post.find('.endorse-toggle,.endorse-inline').text(!on ? 'Un-endorse' : 'Endorse');
    app.alertSuccess(!on ? 'Post endorsed.' : 'Endorsement removed.');
  } catch (err) {
    app.alertError(err?.responseJSON?.error || 'Failed to toggle endorsement');
  }
}

// -------- main wiring ----------
function wire(payload) {
  if (!isStaff()) return;
  getPosts(payload).forEach((p) => {
    const $post = $(`[data-pid="${p.pid}"]`);
    if (!$post.length) return;
    const endorsed = !!p.isEndorsed;
    upsertBadge($post, endorsed);
    const ok = injectIntoDropdown($post, p.pid, endorsed);
    if (!ok) injectInlineCTA($post, p.pid, endorsed);
  });
}

// initial & incremental loads
$(window).on('action:topic.loaded', (_e, data) => wire(data));
$(window).on('action:posts.loaded', (_e, data) => wire(data));
$(window).on('action:ajaxify.end', (_e, data) => wire(data));

// enhance when dropdown is opened
$(document).on('shown.bs.dropdown', '[component="post/tools"],[component="post/menu"]', function () {
  if (!isStaff()) return;
  const $post = $(this).closest('[data-pid]');
  const pid = parseInt($post.attr('data-pid'), 10);
  const on = $post.find('.endorse-badge').is(':visible');
  injectIntoDropdown($post, pid, on);
});


