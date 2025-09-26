'use strict';

// Injects a "Post Anonymously" toggle into the topic composer and wires it into
// the submission payload.
require(['hooks', 'composer'], function (hooks, composer) {
	const COMPONENT = 'composer/anonymous-toggle';

	// Ensure the "Post Anonymously" toggle is present in the composer
	function ensureToggle({ postContainer, postData }) {
		if (!postData || postData.action !== 'topics.post') {
			return;
		}

		if (typeof postData.is_anonymous === 'undefined') {
			postData.is_anonymous = false;
		}

		const existing = postContainer.find(`[data-component="${COMPONENT}"]`);
		if (existing.length) {
			existing.find('input[type="checkbox"]').prop('checked', !!postData.is_anonymous);
			return;
		}

		// Create the toggle HTML element
		const uuid = postContainer.attr('data-uuid');
		const inputId = `composer-anonymous-${uuid}`;
		const toggleEl = $(`
			<div class="composer-anonymous form-check form-switch mt-2" data-component="${COMPONENT}">
				<input class="form-check-input" type="checkbox" id="${inputId}">
				<label class="form-check-label" for="${inputId}">Post Anonymously</label>
			</div>
		`);

		// Set the checked state and add event listener
		const inputEl = toggleEl.find('input');
		inputEl.prop('checked', !!postData.is_anonymous);
		inputEl.on('change', function () {
			const checked = $(this).is(':checked');
			postData.is_anonymous = checked;
			if (uuid && composer.posts && composer.posts[uuid]) {
				composer.posts[uuid].is_anonymous = checked;
			}
		});

		const imageDrop = postContainer.find('.imagedrop').first();
		if (imageDrop.length) {
			imageDrop.before(toggleEl);
		} else {
			postContainer.append(toggleEl);
		}
	}

	hooks.on('action:composer.enhanced', ensureToggle);

	// Add the "is_anonymous" field to the topic push data
	hooks.on('filter:composer.topic.push', function (hookData) {
		hookData = hookData || {};
		hookData.pushData = hookData.pushData || {};
		if (typeof hookData.pushData.is_anonymous === 'undefined') {
			hookData.pushData.is_anonymous = false;
		}
		return hookData;
	});

	// Add the "is_anonymous" field to the topic submission data
	hooks.on('filter:composer.submit', function (hookData) {
		if (hookData && hookData.postData && hookData.postData.action === 'topics.post') {
			hookData.composerData = hookData.composerData || {};
			hookData.composerData.is_anonymous = !!hookData.postData.is_anonymous;
		}
		return hookData;
	});
});
