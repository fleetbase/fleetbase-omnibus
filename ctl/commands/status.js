const fs = require('fs');
const chalk = require('chalk');
const loadServiceConfig = require('../utils/config');
const { resolveFromRoot } = require('../utils/env');

exports.command = 'status [services..]';
exports.describe = 'Show status of all or specific services';

exports.handler = function (argv) {
    const { services: selected } = argv;
    const services = loadServiceConfig();

    for (const [name, config] of Object.entries(services)) {
        if (!selected || selected.length === 0 || selected.includes(name)) {
            const pidPath = resolveFromRoot('services', 'processes', config.pidFile);
            if (!fs.existsSync(pidPath)) {
                console.log(chalk.yellow(`⚠️  ${name}: not running (no PID file)`));
                continue;
            }

            const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'));
            try {
                process.kill(pid, 0); // check if process is alive
                console.log(chalk.green(`✅ ${name}: running (PID ${pid})`));
            } catch {
                console.log(chalk.red(`❌ ${name}: not running (stale PID ${pid})`));
            }
        }
    }
};
