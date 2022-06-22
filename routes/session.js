const bodyParser = require('body-parser');
const moment = require('moment');

module.exports = (app, db, ldap, hub) => {

    app
        .route('/session')
        .get(
            async (req, res) => {
                const remoteIp = req.ip || req.socket.remoteAddress;

                try {
                    const session = await db.Sessions.get(remoteIp);
                    if (!session)
                        return res.redirect('/');

                    res.render('session', {session});

                } catch (e) {
                    return res.render('session', {errors: [e.message]});
                }
            }
        )
        .post(
            bodyParser.urlencoded({extended: false}),
            async (req, res) => {
                const remoteIp = req.ip || req.socket.remoteAddress;
                try {
                    await db.Sessions.remove(remoteIp);
                    hub.closeSession(remoteIp);
                    res.redirect('/');
                } catch (e) {
                    return res.render('session', {errors: [e.message]});
                }
            }
        )

}