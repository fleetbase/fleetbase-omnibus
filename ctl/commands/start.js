const { startService } = require('../utils/spawn');
const services = require('../utils/services');

exports.command = 'start';
exports.describe = 'Start all Fleetbase services';

exports.handler = async function () {
  for (const [name, config] of Object.entries(services)) {
    await startService(name, config);
  }
};