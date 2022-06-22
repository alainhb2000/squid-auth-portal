module.exports = (app, db) => {

    app.get('/query/:ip',
        async (req, res) => {
            const remoteIp = req.params['ip'];

            //aceptar ips de confianza
            if (Array.isArray(global.config.trustedIps) &&
                global.config.trustedIps.indexOf(remoteIp) !== -1) {
                res.status(200);
                res.end();
                return;
            }

            //buscar sesion en bd y retornar nombre de cuenta en caso de existir
            try {
                const session = await db.Sessions.refresh(remoteIp);
                if (session) {
                    res.status(200);
                    res.end(session.account);
                    return;
                }
            } catch {
            }

            //devolver 401 si no existe una sesion abierta en la ip solicitada
            res.status(401);
            res.end('not logged');
        }
    )

}