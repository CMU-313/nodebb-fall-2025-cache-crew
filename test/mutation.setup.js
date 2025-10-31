'use strict';


// Used ChatGPT-5 to create this file
// Stryker Mutator setup
if (!require.main) {
	require.main = module;
}

if (!require.main.require) {
	require.main.require = require;
}

if (!global.__strykerMutationSetupRan) {
	global.__strykerMutationSetupRan = true;
}

if (!process.mainModule) {
	process.mainModule = require.main;
}

if (typeof global.window === 'undefined' || typeof global.document === 'undefined') {
	const { JSDOM } = require('jsdom');
	const dom = new JSDOM('<!doctype html><html><body></body></html>');
	global.window = dom.window;
	global.document = dom.window.document;
	Object.defineProperty(global, 'navigator', {
		value: dom.window.navigator,
		configurable: true,
		enumerable: true,
		writable: true,
	});
}
