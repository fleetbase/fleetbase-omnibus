const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const loadServiceConfig = require('../utils/config');
const { resolveFromRoot } = require('../utils/env');

exports.command = 'stop [services..]';
exports.describe = 'Stop all or specific Fleetbase services';

exports.handler = async function (argv) {
    const { services: selected } = argv;
    const services = loadServiceConfig();

    for (const [name, config] of Object.entries(services)) {
        if (!selected || selected.length === 0 || selected.includes(name)) {
            const pidPath = resolveFromRoot('services', 'processes', config.pidFile);
            if (!fs.existsSync(pidPath)) {
                console.log(chalk.yellow(`⚠️  ${name}: no PID file found.`));
                continue;
            }

            const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'));

            try {
                // Check if the process exists
                process.kill(pid, 0);
                // Then try to stop it
                process.kill(pid);
                console.log(chalk.green(`🛑 Stopped ${name} (PID ${pid})`));
            } catch (err) {
                if (err.code === 'ESRCH') {
                    console.log(chalk.yellow(`⚠️  ${name}: process not running (PID ${pid}) — cleaning up stale PID file.`));
                } else {
                    console.error(chalk.red(`❌ Failed to stop ${name}: ${err.message}`));
                    continue;
                }
            }

            // Always remove the PID file if it's stale or stopped
            fs.unlinkSync(pidPath);
        }
    }
};
