const moment = require('moment');

module.exports = (db) => {

    async function sessionExists(ip) {
        const session = await db.models.Sessions
            .findOne({ _id: ip })
            .lean();

        return session ? session.account : null;
    }

    async function get(ip) {
        return db.models.Sessions
            .findOne({ _id: ip })
            .lean();
    }

    async function add(ip, account) {
        const now = moment(new Date()).unix()
        await db.models.Sessions.updateOne(
            { _id: ip },
            {
                $set: {
                    account: account,
                    startTime: now,
                    lastUpdate: now
                }
            },
            {
                upsert: true
            }
        )
    }

    async function refresh(ip) {
        return db.models.Sessions
            .findOneAndUpdate({ _id: ip }, { $set: { lastUpdate: moment(new Date()).unix() } }, { returnDocument: "after" })
            .lean();
    }

    async function remove(ip) {
        await db.models.Sessions.deleteOne({ _id: ip });
    }

    async function removeExpired(timeout) {
        const now = moment(new Date()).add(-timeout, 'seconds').unix();
        const expired = await db.models.Sessions.find({ lastUpdate: { $lte: now } }).select({ _id: 1 }).lean();
        await db.models.Sessions.deleteMany({ lastUpdate: { $lte: now } });
        return expired;
    }

    db.Sessions = {
        sessionExists,
        get,
        add,
        refresh,
        remove,
        removeExpired
    }

}