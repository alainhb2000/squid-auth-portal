const {Schema, model} = require('mongoose');

module.exports = function (models) {

    const sessions = new Schema(
        {
            _id: String, //direccion ip
            account: String, //cuenta asociada
            startTime: Number, //fecha-hora inicio de sesion
            lastUpdate: Number
        },
        {versionKey: false}
    );

    models.Sessions = model('Sessions', sessions, 'sessions');

};