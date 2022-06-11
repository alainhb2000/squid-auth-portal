const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');

async function rreaddir(dir, allFiles = []) {
    const files = (await fsp.readdir(dir)).map(f => path.join(dir, f));
    allFiles.push(...files.filter(f => path.extname(f) === '.js' && !path.basename(f).startsWith('__')))
    await Promise.all(files.map(async f => (
        (await fsp.stat(f)).isDirectory() && rreaddir(f, allFiles)
    )))
    return allFiles;
}

async function includeAsync(fromFolder, fn) {
    let args = [];
    if (arguments.length > 2)
        for (let i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

    const allFiles = await rreaddir(fromFolder);

    for (const f of allFiles) {
        try {
            if (fn)
                fn(require(f).apply(null, args), f);
            else
                require(f).apply(null, args);
        } catch (e) {
            console.log(`Error including file ${f}\r\n${e.stack}`);
            return false;
        }
    }

    return true;
}


async function fileExists(dir) {
    try {
        const st = await fsp.stat(dir);
        return st.isFile();
    } catch {
        return false;
    }
}

async function directoryExists(dir) {
    try {
        const st = await fsp.stat(dir);
        return st.isDirectory();
    } catch {
        return false;
    }
}

function getMD5(st, outf) {
    let cipher = crypto.createHash('md5');
    cipher.update(st, 'utf8', outf || 'hex');
}

function getSHA(st, inf, outf) {
    let cipher = crypto.createHash('sha1');
    cipher.update(st, inf || 'utf8', outf || 'hex');
    return cipher.digest(outf || 'hex');
}

function ipToInt(ip) {
    if (!ip) {
        throw new Error('E_UNDEFINED_IP');
    }

    if (!regexIP.test(ip)) {
        throw new Error('E_INVALID_IP');
    }

    return ip.split('.').map((octet, index, array) => {
        return parseInt(octet) * Math.pow(256, (array.length - index - 1));
    }).reduce((prev, curr) => {
        return prev + curr;
    });
}

function intToIP(value) {
    if (!value) {
        throw new Error('E_UNDEFINED_INTEGER');
    }

    const result = /\d+/.exec(value);

    if (!result) {
        throw new Error('E_INTEGER_NOT_FOUND');
    }

    value = result[0];

    return [
        (value >> 24) & 0xff,
        (value >> 16) & 0xff,
        (value >> 8) & 0xff,
        value & 0xff
    ].join('.');
}


module.exports = {
    includeAsync,
    fileExists,
    directoryExists,
    getMD5,
    getSHA,
    intToIP,
    ipToInt
}