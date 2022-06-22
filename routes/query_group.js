const moment = require('moment');

module.exports = (app, db, ldap) => {

    const groupsMembers = {};

    async function getGroupMembers(group) {
        const now = moment(new Date());
        if (groupsMembers.hasOwnProperty(group) &&
            now.diff(groupsMembers[group].lastRefresh, "seconds") < 60) {
            return groupsMembers[group].members;
        }

        groupsMembers[group] = {
            members: await ldap.getGroupMembersAsync(`cn=${group},${global.config.groupsDn}`),
            lastRefresh: now
        };

        return groupsMembers[group].members;
    }

    app.get('/query/:ip/:group',
        async (req, res) => {
            const remoteIp = req.params['ip'];

            //aceptar ips de confianza
            if (Array.isArray(global.config.trustedIps) &&
                global.config.trustedIps.indexOf(remoteIp) !== -1) {
                res.status(200);
                res.end();
                return;
            }

            //buscar si hay una cuenta logueada y si esa cuenta pertenece al grupo
            try {
                const session = await db.Sessions.refresh(remoteIp);
                if (session) {
                    const members = await getGroupMembers(req.params.group);
                    if (members.indexOf(session.account) !== -1) {
                        res.status(200);
                        res.end(session.account);
                        return;
                    }
                }
            } catch {
            }

            //devolver 401 si no existe una sesion abierta en la ip solicitada
            res.status(401);
            res.end('not logged');
        }
    )
}