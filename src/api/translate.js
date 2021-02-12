const got = require('got');
const config = require('../config').translate;

const api = got.extend({
  method: 'POST',
  url: 'https://translation.googleapis.com/language/translate/v2',
  responseType: 'json',
});
const run = async (q, source, target) => {
  try {
    const { body: { data } } = await api({ searchParams: {
      q,
      target,
      format: 'text',
      source,
      key: config.apiKey,
    }});
    return data.translations[0].translatedText;
  } catch (e) {
    console.error('Error during translation:', e);
    return 'Translation server error';
  }
};
module.exports = {
  zh2en: async (q) => run(q, 'zh-CN', 'en'),
  en2zh: async (q) => run(q, 'en', 'zh-CN'),
};
