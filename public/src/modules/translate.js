'use strict';

define('translate', ['api', 'translator', 'alerts'], function (api, translator, alerts) {
	const Translate = {};

	Translate.translatePost = async function (postData) {
		try {
			const response = await api.post(`/translate`, {
				content: postData.content,
			});

			if (response && response.translated_content) {
				// Display the translated content in a modal or replace the post content
				require(['bootbox'], function (bootbox) {
					bootbox.dialog({
						title: '[[topic:translated-post]]',
						message: '<div class="translated-content">' + response.translated_content + '</div>',
						buttons: {
							close: {
								label: '[[global:close]]',
								className: 'btn-primary',
							},
						},
					});
				});
			}
		} catch (err) {
			alerts.error(err);
		}
	};

	return Translate;
});
