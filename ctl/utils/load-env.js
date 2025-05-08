const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { resolveFromRoot } = require('./env');

/**
 * Loads env vars from a .env-style file and merges into process.env
 */
function loadEnvFromFile(filename = 'config/credentials.env') {
    const filePath = resolveFromRoot(filename);

    if (!fs.existsSync(filePath)) {
        return;
    }

    const parsed = dotenv.parse(fs.readFileSync(filePath));

    for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

module.exports = { loadEnvFromFile };