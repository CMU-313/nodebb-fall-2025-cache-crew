'use strict';

const winston = require('winston');
const { record, getMetrics } = require('./translationMetrics');

function warn(msg) {
	if (global.env === 'development') {
		winston.warn(msg);
	}
}

const translator = require('../public/src/modules/translator.common')(require('./utils'), (lang, namespace) => {
	const languages = require('./languages');
	return languages.get(lang, namespace);
}, warn);

const originalTranslate = translator.translate;

translator.translate = async function (...args) {
	const start = Date.now();
	try {
		const result = await originalTranslate.apply(this, args);
		record(true, start);
		return result;
	} catch (err) {
		record(false, start);
		throw err;
	}
};

translator.getMetrics = getMetrics;

module.exports = translator;
