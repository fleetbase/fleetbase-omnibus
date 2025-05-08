const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const os = require('os');
const { resolveFromRoot } = require('./env');
const { getDatadirFromArgs } = require('./extract-datadir');
const { runMariaDBInstallDb } = require('./init-mariadb');
const { loadEnvFromFile } = require('./load-env');

const fixArgs = (args = []) => {
    return args.map(arg => {
        if (arg.startsWith('--datadir=')) {
            const relativePath = arg.split('=')[1];
            const absolutePath = resolveFromRoot(relativePath);
            return `--datadir=${absolutePath}`;
        }

        return arg;
    });
};

function getBinaryPath(config) {
    const platform = os.platform();
    const relativeBinPath = config.binaries?.[platform] || config.binary;

    if (!relativeBinPath) {
        throw new Error(`❌ No binary path defined for platform '${platform}'`);
    }

    return resolveFromRoot('services', relativeBinPath);
}

async function startService(name, config) {
    const binaryPath = getBinaryPath(config);
    const pidPath = resolveFromRoot('services', 'processes', `${name}.pid`);
    const logPath = resolveFromRoot('services', 'logs', `${name}.log`);

    // Validate binary
    if (!fs.existsSync(binaryPath)) {
        console.error(chalk.red(`❌ Binary not found for ${name}: ${binaryPath}`));
        return;
    }

    if (fs.existsSync(pidPath)) {
        const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'));
        try {
            process.kill(pid, 0); // probe if still running
            console.log(chalk.yellow(`⚠️  ${name} already running (PID ${pid})`));
            return;
        } catch {
            // PID file exists but process is dead — cleanup and continue
            fs.unlinkSync(pidPath);
        }
    }

    // Ensure directories exist
    fs.mkdirSync(path.dirname(pidPath), { recursive: true });
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    // Setup log file streams
    const out = fs.openSync(logPath, 'a');
    const err = fs.openSync(logPath, 'a');

    // Initialization hook should be here
    if (name === 'mysql') {
        const datadir = getDatadirFromArgs(config.args);
    
        if (datadir && !fs.existsSync(path.join(datadir, 'mysql'))) {
            await runMariaDBInstallDb(datadir);
        }
    }

    // Load environment
    loadEnvFromFile();

    // Spawn process
    const fixedArgs = fixArgs(config.args);
    const child = spawn(binaryPath, fixedArgs, {
        cwd: resolveFromRoot(),
        detached: true,
        stdio: ['ignore', out, err],
        env: { ...process.env } 
    });

    // Detach and save PID
    child.unref();
    fs.writeFileSync(pidPath, child.pid.toString());

    console.log(chalk.green(`✅ Started ${name} (PID ${child.pid}) → logs: services/logs/${name}.log`));
}

module.exports = { startService, getBinaryPath };