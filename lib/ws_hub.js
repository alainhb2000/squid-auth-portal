module.exports = (app, db, io) => {

    const hub = io.of('/keepalive');

    hub.on('connection', async (client) => {
        const ip = client.handshake.address;

        try {
            const session = await db.Sessions.get(ip);
            if (!session) {
                client.emit('no-session');
            } else {
                client.emit('session-data', session);
            }
        } catch {
        }

        client.on('session-refresh', async (dt) => {
            try {
                await db.Sessions.refreshLogged(dt.ip, dt.account);
            } catch {
            }
        })
    });

    function closeSession(ip) {
        hub.emit('session-closed', ip);
    }

    return {
        closeSession
    }

}
