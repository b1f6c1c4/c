const fs = require('fs');
const JSON5 = require('json5');

let cfg;
try {
  cfg = fs.readFileSync('secret.json5', 'utf-8');
} catch {
  cfg = process.env['C_FOR_COOK_CONFIG'];
}

if (!cfg)
  throw new Error('Cannot found configuration from secret.json5 nor C_FOR_COOK_CONFIG');

module.exports = JSON5.parse(cfg);
