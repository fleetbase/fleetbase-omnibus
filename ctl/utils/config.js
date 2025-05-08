const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { resolveFromRoot } = require('./env');

module.exports = function loadServiceConfig() {
    const filePath =resolveFromRoot('config', 'services.yml');
    const raw = fs.readFileSync(filePath, 'utf8');
    return yaml.load(raw);
};
