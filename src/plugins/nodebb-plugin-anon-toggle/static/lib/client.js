/* global document, MutationObserver */
'use strict';
require(['hooks', 'jquery'], function (hooks, $) {
	function injectInto($composer) {
		if (!$composer || !$composer.length) return;
		if ($composer.find('#anon-toggle').length) return;

		// Create the HTML for the checkbox
		const html = `
      <div class="form-check mt-2" id="anon-toggle-wrap">
        <input class="form-check-input" type="checkbox" id="anon-toggle" name="anonymous" value="1">
        <label class="form-check-label" for="anon-toggle">Post anonymously</label>
      </div>
    `;

		// Place above image drop area if it exists
		const $img = $composer.find('.imagedrop').first();
		if ($img.length) {
			$img.before(html);
		} else {
			// Place at the end of the composer controls
			$composer.find('.composer-container .p-2').first().append(html);
		}
	}

	// Scan the page for composers, inject the toggle checkbox
	function scanAndInject() {
		$('.composer').each(function () { injectInto($(this)); });
	}

	$(scanAndInject);

	// Keep an eye on the DOM for new composers
	const mo = new MutationObserver(scanAndInject);
	mo.observe(document.body, { childList: true, subtree: true });

	// Re-scan when composer events occur
	[
		'action:composer.loaded',
		'action:composer.reply',
		'action:composer.topic.new',
		'action:composer.enhanced',
		'action:composer.resize',
	].forEach(evt => hooks.on(evt, () => scanAndInject()));

	// When the composer is submitted, add the anonymous flag to the payload
	hooks.on('filter:composer.formatData', function (payload) {
		try {
			const $c = payload?.composer?.$el || $('.composer').last();
			payload.data = payload.data || {};
			payload.data.anonymous = !!$c.find('#anon-toggle').is(':checked');
		} catch (e) { }
		return payload;
	});
});