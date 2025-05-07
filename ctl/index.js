#!/usr/bin/env node

const yargs = require('yargs');

yargs
  .scriptName('fleetbase-ctl')
  .command(require('./commands/start'))
  .command(require('./commands/stop'))
  .command(require('./commands/status'))
  .command(require('./commands/logs'))
  .command(require('./commands/doctor'))
  .demandCommand()
  .help()
  .argv;