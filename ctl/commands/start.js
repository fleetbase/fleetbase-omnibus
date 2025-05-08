const { startService } = require('../utils/spawn');
const loadServiceConfig = require('../utils/config');
const { ensureCredentials } = require('../utils/generate-credentials');

exports.command = 'start [services..]';
exports.describe = 'Start all Fleetbase services or specific ones';
exports.builder = (yargs) => {
    return yargs.positional('services', {
        describe: 'Services to start (optional)',
        type: 'string',
    });
};

exports.handler = async function (argv) {
    await ensureCredentials();
    
    const { services: selected } = argv;
    const services = loadServiceConfig();

    for (const [name, config] of Object.entries(services)) {
        if (!selected || selected.length === 0 || selected.includes(name)) {
            await startService(name, config);
        }
    }
};
