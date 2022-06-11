module.exports = (db, ws, timeout) => {

    async function removeExpired(timeout) {
        try {
            const expired = await db.Sessions.removeExpired(timeout);

            for (let i = 0; i < expired.length; i++) {
                const session = expired[i];
                console.log(`Cerrando sesión ${session._id}`);
                await ws.closeSession(session._id);
            }

        } catch (e) {
            console.error(`Error procesando sesiones expiradas: ${e.stack || e.message}`);
        }
    }

    async function schedule(timeout) {
        console.log('Revisando sesiones expiradas por inactividad...');
        await removeExpired(timeout);
        setTimeout(async () => await schedule(timeout), 15000);
    }

    (async () => {
        await schedule(timeout);
    })();
}