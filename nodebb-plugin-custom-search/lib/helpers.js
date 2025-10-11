"use strict";

const htmlToText = require('html-to-text');

function stripHtml(html) {
	if (!html) return '';
	// Use html-to-text for robust stripping
	return htmlToText.htmlToText(String(html), { wordwrap: false });
}

/**
 * Build a plain-text snippet around the first occurrence of any token.
 * Returns null if no token found.
 */
function buildSnippet(rawText, tokensArr, left = 60, right = 120) {
	if (!rawText) return null;
	if (!tokensArr || !tokensArr.length) return null;

	const text = stripHtml(rawText);
	const lc = text.toLowerCase();
	let firstPos = -1;
	let matchLen = 0;

	for (const t of tokensArr) {
		if (!t) continue;
		const term = String(t).toLowerCase();
		const pos = lc.indexOf(term);
		if (pos !== -1 && (firstPos === -1 || pos < firstPos)) {
			firstPos = pos;
			matchLen = term.length;
		}
	}

	if (firstPos === -1) return null;

	const start = Math.max(0, firstPos - left);
	const end = Math.min(text.length, firstPos + matchLen + right);
	let snippet = text.slice(start, end);

	if (start > 0) snippet = '...' + snippet;
	if (end < text.length) snippet = snippet + '...';

	return snippet;
}

function findMatchingPidsFromPosts(postsFields, searchTerm) {
	if (!Array.isArray(postsFields) || !searchTerm) return [];

	const term = String(searchTerm).toLowerCase();
	const matched = [];

	for (const p of postsFields) {
		if (!p) continue;
		const content = String(p.sourceContent || p.content || '');
		if (content.toLowerCase().includes(term)) matched.push(p.pid);
	}

	return matched;
}

module.exports = {
	stripHtml,
	buildSnippet,
	findMatchingPidsFromPosts
};
