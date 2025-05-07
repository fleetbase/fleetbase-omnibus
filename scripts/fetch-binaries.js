#!/usr/bin/env node

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { pipeline } = require('stream/promises');
const { https } = require('follow-redirects');
const tar = require('tar');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const { spawn } = require('child_process');
const axios = require('axios');

// Parse CLI args
const argv = yargs(hideBin(process.argv))
    .option('path', {
        alias: 'p',
        type: 'string',
        description: 'Target directory to extract binaries to',
        default: 'services',
    })
    .option('mariadb-version', {
        type: 'string',
        default: '10.6',
        description: 'MariaDB major version to fetch latest binary for'
    })
    .help().argv;

// Detect platform
const platform = os.platform(); // 'darwin', 'linux', 'win32'
const supportedPlatforms = ['linux', 'darwin'];

if (!supportedPlatforms.includes(platform)) {
    console.error(chalk.red(`❌ Platform '${platform}' not supported yet.`));
    process.exit(1);
}

// Binary URLs per platform
const binarySources = {
    linux: {
        redis: 'https://download.redis.io/releases/redis-7.2.4.tar.gz',
        mariadb: resolveMariaDBDownloadUrl,
    },
    darwin: {
        redis: 'https://download.redis.io/releases/redis-7.2.4.tar.gz',
        mariadb: resolveMariaDBDownloadUrl,
    },
};

const downloads = binarySources[platform];
const outputBase = path.resolve(process.cwd(), argv.path);

async function downloadFile(url, dest) {
    await fs.ensureDir(path.dirname(dest));
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download ${url} (status ${response.statusCode})`));
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            })
            .on('error', reject);
    });
}

async function extractTarArchive(filePath, destDir) {
    await fs.ensureDir(destDir);
    await tar.x({
        file: filePath,
        cwd: destDir,
        strip: 1,
    });
}

async function buildRedis(sourceDir, outputBinDir) {
    console.log(chalk.yellow(`🔨 Building Redis from source...`));

    await new Promise((resolve, reject) => {
        const build = spawn('make', [], {
            cwd: sourceDir,
            stdio: 'inherit',
        });

        build.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`make exited with code ${code}`));
            }
        });

        build.on('error', (err) => {
            reject(new Error(`Failed to spawn make: ${err.message}`));
        });
    });

    const platform = os.platform(); // 'darwin', 'linux', etc.
    const binDir = path.join(outputBinDir, platform);
    const redisServerSrc = path.join(sourceDir, 'src', 'redis-server');
    const redisCliSrc = path.join(sourceDir, 'src', 'redis-cli');
    const redisServerDst = path.join(binDir, 'redis-server');
    const redisCliDst = path.join(binDir, 'redis-cli');

    await fs.ensureDir(binDir);
    await fs.copy(redisServerSrc, redisServerDst);
    await fs.copy(redisCliSrc, redisCliDst);

    console.log(chalk.green(`✅ Copied redis-server → ${redisServerDst}`));
    console.log(chalk.green(`✅ Copied redis-cli → ${redisCliDst}`));
}

async function resolveMariaDBDownloadUrl(version = '10.6') {
    const platform = os.platform(); // 'darwin', 'linux', etc.
    const arch = os.arch(); // 'x64', 'arm64', etc.

    const osMap = {
        darwin: 'macos',
        linux: 'linux',
    };

    const cpuMap = {
        x64: 'x86_64',
        arm64: 'arm64',
    };

    const osId = osMap[platform];
    const cpuId = cpuMap[arch];

    const releaseApi = `https://downloads.mariadb.org/rest-api/mariadb/${version}/latest/`;
    const { data } = await axios.get(releaseApi);

    const release = Object.values(data.releases)[0];

    const file = release.files.find(f =>
        f.package_type === 'bintar' &&
        f.os === osId &&
        f.cpu === cpuId &&
        f.file_name.endsWith('.tar.gz')
    );

    if (!file) {
        if (osId === 'macos') {
            console.warn(chalk.yellow('⚠️  Skipping MariaDB download on macOS — will use Homebrew fallback.'));
            return null;
        }
    
        throw new Error(`No compatible MariaDB binary found for OS: ${osId}, CPU: ${cpuId}`);
    }

    return file.file_download_url;
}

async function finalizeMariadb(sourceDir, outputBinDir) {
    console.log(chalk.yellow(`🔧 Extracting MariaDB binaries...`));

    const platform = os.platform();
    const binDir = path.join(outputBinDir, platform);

    const binFiles = ['mysqld', 'mysql', 'mysqladmin'];
    await fs.ensureDir(binDir);

    for (const file of binFiles) {
        const src = path.join(sourceDir, 'bin', file);
        const dst = path.join(binDir, file);

        if (await fs.pathExists(src)) {
            await fs.copy(src, dst);
            console.log(chalk.green(`✅ Copied ${file} → ${dst}`));
        } else {
            console.warn(chalk.yellow(`⚠️  Skipped ${file} (not found in extracted MariaDB)`));
        }
    }
}

async function fetchAndExtractBinary(name, url, targetDir) {
    const tempPath = path.join(os.tmpdir(), `${name}-${Date.now()}.tar`);
    console.log(chalk.blue(`⬇️  Downloading ${name} from ${url}...`));
    await downloadFile(url, tempPath);

    console.log(chalk.blue(`📦 Extracting ${name} to ${targetDir}...`));
    await extractTarArchive(tempPath, targetDir);
    await fs.remove(tempPath);

    if (name === 'redis') {
        const outputBinDir = path.resolve(argv.path, '../bin');
        await buildRedis(targetDir, outputBinDir);
    }

    if (name === 'mariadb') {
        const outputBinDir = path.resolve(argv.path, '../bin');
        await finalizeMariadb(targetDir, outputBinDir);
    }

    console.log(chalk.green(`✅ ${name} ready at ${targetDir}`));
}

(async () => {
    try {
        for (let [name, url] of Object.entries(downloads)) {
            const targetPath = path.join(outputBase, name);
            if (typeof url === 'function') {
                url = await url();
            }
            
            if (url) {
                await fetchAndExtractBinary(name, url, targetPath);
            } else if (name === 'mariadb' && platform === 'darwin') {
                console.log(chalk.cyan('📥 Using Homebrew for MariaDB...'));
                const outputBinDir = path.resolve(argv.path, '../bin');
                const binDir = path.join(outputBinDir, platform);
                await fs.ensureDir(binDir);
            
                const { execSync } = require('child_process');
                const brewPrefix = execSync('brew --prefix mariadb').toString().trim();
            
                for (const bin of ['mysqld', 'mysql', 'mysqladmin']) {
                    const src = path.join(brewPrefix, 'bin', bin);
                    const dest = path.join(binDir, bin);
                    if (await fs.pathExists(src)) {
                        await fs.copy(src, dest);
                        console.log(chalk.green(`✅ Copied ${bin} → ${dest}`));
                    } else {
                        console.warn(chalk.yellow(`⚠️  ${bin} not found in Homebrew mariadb.`));
                    }
                }
            }
        }

        console.log(chalk.greenBright('\n🚀 All binaries downloaded, extracted, and ready!'));
    } catch (err) {
        console.error(chalk.red(`❌ Failed: ${err.message}`));
        process.exit(1);
    }
})();
