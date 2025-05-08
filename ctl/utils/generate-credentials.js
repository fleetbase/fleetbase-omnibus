const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { resolveFromRoot } = require('./env');

const secretsPath = resolveFromRoot('secrets', 'credentials.json');
const envPath = resolveFromRoot('config', 'credentials.env');

function randomString(length = 24) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

function createDefaultSecrets() {
    return {
        mysql: {
            user: 'fleetbase',
            password: randomString()
        },
        redis: {
            password: randomString()
        }
    };
}

function renderEnv(secrets) {
    return [
        'DB_HOST=127.0.0.1',
        'DB_PORT=23306',
        'DB_DATABASE=fleetbase',
        `DB_USERNAME=${secrets.mysql.user}`,
        `DB_PASSWORD=${secrets.mysql.password}`,
        'REDIS_HOST=127.0.0.1',
        'REDIS_PORT=26379',
        `REDIS_PASSWORD=${secrets.redis.password}`
    ].join('\n');
}

async function ensureCredentials() {
    if (await fs.pathExists(secretsPath)) {
        return; // already exists, skip
    }

    const secrets = createDefaultSecrets();
    await fs.ensureDir(path.dirname(secretsPath));
    await fs.writeJson(secretsPath, secrets, { spaces: 2 });

    await fs.ensureDir(path.dirname(envPath));
    await fs.writeFile(envPath, renderEnv(secrets));

    console.log(`🔐 Generated new service credentials at ${secretsPath}`);
    console.log(`📄 Created .env for API at ${envPath}`);
}

module.exports = { ensureCredentials };