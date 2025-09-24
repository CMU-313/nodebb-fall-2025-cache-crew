'use strict';

/**
 * Placeholder module for injecting anonymous post controls into the composer.
 */
require(['hooks'], function (hooks) {
	hooks.on('action:composer.enhance', function () {
		// Toggle will be rendered in a follow-up change.
	});
});

