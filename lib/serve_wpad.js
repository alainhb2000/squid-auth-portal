const path = require('path');

module.exports = (app) => {

    function serveWpad(req, res) {
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        res.header('content-type', 'application/x-ns-proxy-autoconfig');
        res.sendFile(path.join(__dirname, '..', 'config', 'wpad.js'));
    }

    app.get('/wpad.pad', serveWpad);
    app.get('/wpad.pa', serveWpad);
    app.get('/wpad.dat', serveWpad);
    app.get('/wpad.da', serveWpad);
    app.get('/proxy.pac', serveWpad);

}
