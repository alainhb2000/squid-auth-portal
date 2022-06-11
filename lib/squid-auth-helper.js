const serverIp = '10.5.44.45';
const https = require('https');
const port = 443;

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ipRegex = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/;

function getIpFromLine(line) {
    const m = ipRegex.exec(line);
    if (m) {
        return `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
    }
    return null;
}

function query(line) {
    const ip = getIpFromLine(line);
    if (ip) {
        try {
            const req = https.request({
                hostname: serverIp,
                port: port,
                path: `/query/${ip}`,
                method: 'GET',
                agent: new https.Agent({
                    rejectUnauthorized: false
                })
            }, res => {
                if (res.statusCode !== 200) {
                    return process.stdout.write("ERR\n");
                }

                let data = '';

                res.on('data', d => {
                    data += d;
                });

                res.on('end', () => {
                    process.stdout.write(`OK user=${data}\n`);
                })

            })

            req.on('error', error => {
                process.stdout.write("ERR\n");
            });

            req.end();

            return;
        } catch (e) {
            console.log(e)
        }
    }
    process.stdout.write("ERR\n");
}

rl.on('line', query);
