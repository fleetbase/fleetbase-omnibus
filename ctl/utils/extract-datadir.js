const path = require('path');
const { resolveFromRoot } = require('./env');

function getDatadirFromArgs(args = []) {
    for (const arg of args) {
        if (arg.startsWith('--datadir=')) {
            const dir = arg.split('=')[1];
            return path.isAbsolute(dir) ? dir : resolveFromRoot(dir);
        }
    }

    return null;
}

module.exports = { getDatadirFromArgs };