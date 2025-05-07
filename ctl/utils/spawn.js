const fs = require('fs-extra');
const { execa } = require('execa');
const path = require('path');

async function startService(name, config) {
  const out = fs.openSync(config.logFile, 'a');
  const err = fs.openSync(config.logFile, 'a');

  console.log(`🔧 Starting ${config.name}...`);

  const subprocess = execa(config.binary, config.args, {
    stdio: ['ignore', out, err],
    detached: true
  });

  subprocess.unref(); // Allows parent to exit while service runs

  const pid = (await subprocess).pid;
  await fs.outputFile(config.pidFile, pid.toString());

  console.log(`✅ ${config.name} started with PID ${pid}`);
}

module.exports = { startService };