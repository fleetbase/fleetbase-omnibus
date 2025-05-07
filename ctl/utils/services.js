const path = require('path');

const baseDir = '/opt/fleetbase';
const binDir = path.join(baseDir, 'services');
const runtimeDir = path.join(baseDir, 'var', 'runtime');
const logsDir = path.join(baseDir, 'logs');

module.exports = {
    mysql: {
        name: 'MySQL',
        binary: path.join(binDir, 'mysql', 'bin', 'mysqld'),
        args: [`--datadir=${path.join(binDir, 'mysql', 'data')}`, '--socket=/tmp/mysql.sock', '--port=3306'],
        pidFile: path.join(runtimeDir, 'mysql.pid'),
        logFile: path.join(logsDir, 'mysql.log'),
    },

    redis: {
        name: 'Redis',
        binary: path.join(binDir, 'redis', 'redis-server'),
        args: [],
        pidFile: path.join(runtimeDir, 'redis.pid'),
        logFile: path.join(logsDir, 'redis.log'),
    },

    socketcluster: {
        name: 'SocketCluster',
        binary: path.join(binDir, 'node', 'bin', 'node'),
        args: [path.join(binDir, 'socketcluster', 'index.js')],
        pidFile: path.join(runtimeDir, 'socketcluster.pid'),
        logFile: path.join(logsDir, 'socketcluster.log'),
    },

    api: {
        name: 'Fleetbase API',
        binary: path.join(binDir, 'fleetbase-api'),
        args: [], // Add args like `-c` config path or port if needed
        pidFile: path.join(runtimeDir, 'api.pid'),
        logFile: path.join(logsDir, 'api.log'),
    },

    console: {
        name: 'Fleetbase Console',
        binary: path.join(binDir, 'caddy', 'caddy'),
        args: ['run', '--config', path.join(binDir, 'caddy', 'Caddyfile')],
        pidFile: path.join(runtimeDir, 'caddy.pid'),
        logFile: path.join(logsDir, 'caddy.log'),
    },
};
