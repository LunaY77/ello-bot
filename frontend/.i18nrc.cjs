const { defineConfig } = require('@lobehub/i18n-cli');

module.exports = defineConfig({
  entry: 'locales/en-US',
  entryLocale: 'en-US',
  output: 'locales',
  outputLocales: ['zh-CN'],
  temperature: 0,
  modelName: 'gpt-4o',
  experimental: {
    jsonMode: true,
  },
});
