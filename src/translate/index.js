/* eslint-disable strict */
//var request = require('request');

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
    // Edit the translator URL below
    const TRANSLATOR_API = 'http://128.2.220.152:5000/'; // Update with your translator API link
    try {
        const response = await fetch(TRANSLATOR_API + '/?content=' + encodeURIComponent(postData.content));
        const data = await response.json();
        return [data.is_english, data.translated_content];
    } catch (err) {
        // Default behavior: treat as English and return the original message as fallback
        console.error('Translation API error:', err);
        return ['is_english', postData.content];
    }
};