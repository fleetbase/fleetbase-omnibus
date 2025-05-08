const path = require('path');

const OMNIBUS_ROOT = process.env.FLEETBASE_OMNIBUS_PATH || '/opt/fleetbase';

module.exports = {
    OMNIBUS_ROOT,
    resolveFromRoot: (...segments) => path.resolve(OMNIBUS_ROOT, ...segments),
};
