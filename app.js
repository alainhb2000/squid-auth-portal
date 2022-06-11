const io = require('socket.io')();
const fs = require('fs/promises');
const path = require('path');
const https = require('https');
const http = require('http');
const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const logger = require('morgan');
const { includeAsync } = require('./lib/tools');

global.debug = process.env.NODE_ENV !== "production";

let httpsServerOptions = {};
let config = {};

function getErrorFunc(port) {
    return function (error) {
        if (error.syscall !== 'listen') throw error;

        let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
        switch (error.code) {
            case 'EACCES':
                console.error(`${bind} requiere permisos elevados`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(`${bind} ya está en uso`);
                process.exit(1);
                break;

            default:
                throw error;
        }
    };
}

(async () => {

    const configPath = __dirname + '/config/config.json';

    try {

        const buff = await fs.readFile(configPath);
        config = JSON.parse(buff.toString());

        //chequear la conexion a mongodb
        if (!config.mongoConnection)
            return console.error('Especifique la cadena de conexión al MongoDB.');

        //chequear no va a usar el servicio detras de un servidor web, exigir certificados en la configuracion
        if (!config.isBehindWebserver && (!config.cert || !config.key))
            return console.error('Especifique los certificados SSL para el servicio, "cert" -> certificado, "key" -> key del certificado.');
        else {
            //crear configuracion para certificados
            httpsServerOptions = {
                key: await fs.readFile(config.key),
                cert: await fs.readFile(config.cert),
            };
        }

        console.log('La configuración ha sido cargada...');
        global.config = config;

    } catch (e) {
        return console.error(`Ocurrió un error cargando el archivo de configuración: ${configPath}, ${e.stack || e.message}`);
    }

    //conectar a la base de datos
    try {
        await mongoose.connect(config.mongoConnection, { useUnifiedTopology: true, useNewUrlParser: true });
        console.log('Conexión con MongoDB exitosa...');
    } catch (e) {
        return console.error(`Ocurrió un error conectando al servidor de BD. ${e.stack || e.message}`);
    }

    //chequear terminacion del proceso
    process.on('SIGINT', async () => {
        await mongoose.connection.close();

        console.log("Portal apagado...");

        setTimeout(function () {
            process.exit(0);
        }, 200);
    });

    process.on('uncaughtException', err => {
        console.error(`Unhandled exception:\r\n${err.message}\r\nStack: ${err.stack || ''}.`);
    });

    process.on('unhandledRejection', (err, promise) => {
        console.error(`Unhandled rejection at:\r\n${promise}\r\nException:${err.message}\r\nStack: ${err.stack || ''}`);
    });

    //context y esquemas BD
    const db = { models: {} };
    if (!await includeAsync(__dirname + '/db/schemas', null, db.models)) return;
    console.log('Esquemas de DB cargados...');

    if (!await includeAsync(__dirname + '/db/context', null, db)) return;
    console.log('Contexto de DB cargado...');

    //app web
    const app = express();

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    app.use(logger('dev'));
    app.use(compression({ level: 9 }));

    //evitar que el navegador guarde en cache estas páginas
    app.use((req, res, next) => {
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        next();
    });

    app.use((req, res, next) => {
        res.locals.pretty = true;
        next();
    })
    app.use(express.static(path.join(__dirname, 'public'), { maxAge: 60 * 60 * 1000 }));

    const ldap = require('./lib/myldap')(config);
    const hub = require('./lib/ws_hub')(app, db, io);
    
    //comenzar a monitorear sesiones que expiren por inactividad
    require('./lib/monitor_expired')(db, hub, config.sessionExpiration);

    if (!await includeAsync(__dirname + '/routes', null, app, db, ldap, hub)) return;
    console.log('Rutas cargadas...');

    if (config.serveWpad) {
        //servir archivo wpad
        require('./lib/serve_wpad')(app);
    }

    app.use((req, res) => {
        let err = new Error('La página solicitada no está disponible');
        res.status(404);
        res.render(path.join(__dirname, 'views', 'error'), {
            message: err.message,
            error: global.debug ? err : {},
            host: req.headers['host'],
            url: `${req.protocol}://${req.headers.host}${(req.url.substring(0, 1) !== '/' ? '/' : '')}${req.url}`
        });
    });

    //si no esta detras de un servidor web, levantar puertos 80 y 443 con los certificados,
    //de lo contrario solo escuchar por el puerto de backend en http
    if (!config.isBehindWebserver) {

        //crear app de redirecciona https
        const appRedirect = require('express')();
        appRedirect.get('/', function (req, res) {
            res.redirect("https://" + req.headers['host'] + req.url);
        });

        if (config.serveWpad) {
            //servir archivo wpad
            require('./lib/serve_wpad')(appRedirect);
        }

        const httpServer = http.createServer(appRedirect);
        const httpsServer = https.createServer(httpsServerOptions, app);

        io.attach(httpsServer);

        httpsServer.listen(443, "0.0.0.0");
        httpsServer.on('error', getErrorFunc(443));

        httpServer.listen(80, "0.0.0.0");
        httpServer.on('error', getErrorFunc(80));

        console.log("Escuchando por los puertos 80 y 443...");

    } else {
        //escuchar solo por http en el puerto backendPort

        const httpServer = http.createServer(app);
        io.attach(httpServer);

        httpServer.listen(config.backendPort, "0.0.0.0");
        httpServer.on('error', getErrorFunc(config.backendPort));

        console.log(`Escuchando por el puerto ${config.backendPort}...`);
    }

    console.log('Servicio iniciado exitosamente...');

})();
