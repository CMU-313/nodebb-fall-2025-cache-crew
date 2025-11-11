'use strict';

const translator = require('../../translate');

module.exports = async function (req, res) {
	if (!req.body || !req.body.content) {
		return res.status(400).json({ error: '[[error:invalid-data]]' });
	}

	try {
		const [isEnglish, translatedContent] = await translator.translate(req.body);
		res.json({
			is_english: isEnglish,
			translated_content: translatedContent,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};
