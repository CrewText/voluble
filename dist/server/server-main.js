"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const fs = require("fs");
const jsend = require("jsend");
const path = require('path');
const bodyParser = require('body-parser');
var xmlParser = require('express-xml-bodyparser');
const winston = require('winston');
if (!process.env.IS_PRODUCTION) {
    winston.info("Detected dev environment");
    winston.level = 'debug';
}
else {
    winston.info("Detected prod environment");
    winston.level = 'info';
}
const https = require('https');
winston.info("Connecting to database");
const db = require("../models");
db.initialize_database();
winston.info("Loading routes");
const routes_index = require('./routes');
const routes_users = require('./routes/users');
const routes_groups = require('./routes/groups');
const routes_contacts = require('./routes/contacts');
const routes_messages = require('./routes/messages');
const routes_services = require('./routes/services');
const routes_blasts = require('./routes/blasts');
const routes_servicechains = require('./routes/servicechains');
const routes_service_endpoint_generic = require('./routes/service_endpoint');
winston.info("Loading plugin manager");
const plugin_manager_1 = require("../plugin-manager");
winston.info("Loading queue manager");
const queue_manager_1 = require("../queue-manager");
queue_manager_1.QueueManager.init_queues();
winston.info("Starting Express server");
const app = express();
app.use(jsend.middleware);
function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
if (!fs.existsSync(process.env.SSL_KEY_PATH || "")) {
    throw new Error("SSL key does not exist at " + process.env.SSL_KEY_PATH);
}
if (!fs.existsSync(process.env.SSL_CERT_PATH || "")) {
    throw new Error("SSL certificate does not exist at " + process.env.SSL_CERT_PATH);
}
let https_options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || ""),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || "")
};
var server = https.createServer(https_options, app);
server.listen(port);
server.on('error', onError);
winston.info("Listening on port " + port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(xmlParser({ explicitArray: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes_index);
app.use('/users', routes_users);
app.use('/groups', routes_groups);
app.use('/contacts', routes_contacts);
app.use('/messages', routes_messages);
app.use('/services', routes_services);
app.use('/services', routes_service_endpoint_generic);
app.use('/blasts', routes_blasts);
app.use('/servicechains', routes_servicechains);
winston.info("Initing all plugins");
plugin_manager_1.PluginManager.initAllPlugins();
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = process.env.IS_PRODUCTION ? err : {};
    res.status(err.status || 500);
});
module.exports = app;
