const bodyParser = require('body-parser');

module.exports = (app, db, ldap) => {

    app.get('/',
        async (req, res) => {
            const remoteIp = req.ip || req.socket.remoteAddress;

            try {
                const session = await db.Sessions.sessionExists(remoteIp);
                if (session)
                    return res.redirect('/session');

            } catch (e) {
                return res.render('index', {errors: [e.message]});
            }

            res.render('index', {errors: []});
        }
    )

    app.post('/',
        bodyParser.urlencoded({extended: false}),
        async (req, res) => {
            if (!req.body.user || !req.body.password) {
                return res.render('index', {errors: ["Datos de autenticación incorrectos"]});
            }

            const remoteIp = req.ip || req.socket.remoteAddress;
            const fixedUser = req.body.user.toLowerCase();

            try {
                let success = await ldap.authenticateAsync(fixedUser, req.body.password);

                if (success) {

                    await db.Sessions.add(remoteIp, fixedUser);

                    res.redirect('/session');

                } else {
                    return res.render('index', {errors: ["Datos de autenticación incorrectos"]});
                }


            } catch (e) {
                res.render('index', {errors: [e.message]});
            }
        }
    );

}