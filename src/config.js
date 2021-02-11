const fs = require('fs');
const JSON5 = require('json5');

module.exports = JSON5.parse(fs.readFileSync('secret.json5', 'utf-8'));
