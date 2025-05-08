const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveFromRoot } = require('./env');
const chalk = require('chalk');

async function runMariaDBInstallDb(datadir) {
    const installScript = resolveFromRoot('services/bin/darwin/mariadb-install-db');

    if (!fs.existsSync(installScript)) {
        throw new Error(`❌ mariadb-install-db script not found at ${installScript}`);
    }

    console.log(chalk.blue(`🛠 Initializing MariaDB system tables...`));

    return new Promise((resolve, reject) => {
        const child = spawn(installScript, [`--datadir=${datadir}`]);

        let output = '';
        let error = '';

        child.stdout.on('data', data => {
            output += data.toString();
        });

        child.stderr.on('data', data => {
            error += data.toString();
        });

        child.on('close', code => {
            if (code === 0) {
                // Filter and print relevant lines
                const lines = output.split('\n');
                const filtered = lines.filter(line =>
                    line.includes('Installing') ||
                    line.startsWith('OK') ||
                    line.includes('created') ||
                    line.includes('root@localhost') ||
                    line.includes('ron@localhost')
                );

                filtered.forEach(line => console.log(chalk.gray(`↳ ${line.trim()}`)));
                console.log(chalk.green(`✅ mariadb-install-db completed.`));
                resolve();
            } else {
                console.error(chalk.red(`❌ mariadb-install-db failed:`));
                console.error(output || error);
                reject(new Error(`Exit code: ${code}`));
            }
        });
    });
}

module.exports = { runMariaDBInstallDb };