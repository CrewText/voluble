import * as express from "express";
import * as fs from 'fs'
const path = require('path');
const bodyParser = require('body-parser');
const winston = require('winston')

if (!process.env.IS_PRODUCTION) {
  winston.info("Detected dev environment")
  winston.level = 'debug'
} else {
  winston.info("Detected prod environment")
  winston.level = 'info'
}
const https = require('https');

winston.info("Connecting to database")
import * as db from './models'

winston.info("Loading routes")
const index = require('./routes/index');
const users = require('./routes/users');
const routerGroups = require('./routes/groups');
const routerContacts = require('./routes/contacts');
const routerMessages = require('./routes/messages');
const routerServices = require('./routes/services');
const routerBlasts = require('./routes/blasts');
const routerServicechains = require('./routes/servicechains');

winston.info("Loading plugin manager")
import { PluginManager } from './bin/plugin-manager/plugin-manager'

winston.info("Starting Express server")
const app = express();

/**
 * Get port from environment and store in Express.
 */
function normalizePort(val: string) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
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

if (!fs.existsSync(process.env.SSL_KEY_PATH || "")){
  throw new Error("SSL key does not exist at " + process.env.SSL_KEY_PATH)
}

if (!fs.existsSync(process.env.SSL_CERT_PATH || "")){
  throw new Error("SSL certificate does not exist at " + process.env.SSL_CERT_PATH)
}

let https_options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH || ""),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH || "")
}
var server = https.createServer(https_options, app);

server.listen(port);
server.on('error', onError);
winston.info("Listening on port " + port)

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/groups', routerGroups)
app.use('/contacts', routerContacts)
app.use('/messages', routerMessages)
app.use('/services', routerServices)
app.use('/blasts', routerBlasts)
app.use('/servicechains', routerServicechains)

// Set up plugin manager
winston.info("Initing all plugins")
PluginManager.initAllPlugins(process.env.PLUGIN_DIR || "./bin/plugins")


// catch 404 and forward to error handler
app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
  let err: any = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.IS_PRODUCTION ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
