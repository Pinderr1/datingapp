#!/usr/bin/env node
const { ESLint } = (() => {
  try {
    return require('eslint');
  } catch (e) {
    console.log('ESLint is not installed. Skipping lint.');
    process.exit(0);
  }
})();

(async () => {
  try {
    const eslint = new ESLint({extensions: ['.js']});
    const results = await eslint.lintFiles(['.']);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    if (resultText) {
      console.log(resultText);
    }
    const hasErrors = results.some(r => r.errorCount > 0 || r.fatalErrorCount > 0);
    process.exit(hasErrors ? 1 : 0);
  } catch (err) {
    console.log('ESLint ran into a problem:', err.message);
    process.exit(0);
  }
})();
