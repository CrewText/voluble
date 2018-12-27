import * as Promise from 'bluebird';
import * as cors from 'cors';
import * as express from "express";
import * as jsend from 'jsend';
import * as db from '../models';
import { PluginManager } from '../plugin-manager';
import { QueueManager } from '../queue-manager';

const path = require('path');
const bodyParser = require('body-parser');
var xmlParser = require('express-xml-bodyparser');
const winston = require('winston')
console.log(process.env.NODE_ENV)

if (process.env.NODE_ENV == "production") {
  winston.info("Detected prod environment")
  winston.level = 'info'
} else {
  winston.info("Detected non-prod environment")
  winston.level = 'debug'
}
const http = require('https');

winston.info("Loading plugin manager")

winston.info("Loading queue manager")
QueueManager.init_queues()

winston.info("Connecting to database")

winston.info("Loading routes")
const routes_index = require('./routes')
//const routes_users = require('./routes/users')
const routes_orgs = require('./routes/organizations')
const routes_contacts = require('./routes/contacts')
const routes_messages = require('./routes/messages')
const routes_services = require('./routes/services')
const routes_blasts = require('./routes/blasts')
const routes_servicechains = require('./routes/servicechains')
const routes_service_endpoint_generic = require('./routes/service_endpoint')

winston.info("Starting Express server")
const app = express();
app.use(jsend.middleware)

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

var port = parseInt(process.env.PORT, 10) || 5000
app.set('port', port);

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(xmlParser({ explicitArray: false }))
app.use(express.static(path.join(__dirname, 'public')));

//let corsWhitelist = [/localhost/, /lvh\.me/, /127\.0\.0\.1/, /voluble-poc\.herokuapp\.com$/]
console.log("Using cors")
app.use(cors())

app.options('*', cors()) // include before other routes

app.use('/', routes_index);
//app.use('/users', routes_users);
app.use('/orgs', routes_orgs)
app.use('/contacts', routes_contacts)
app.use('/messages', routes_messages)
app.use('/services', routes_services)
app.use('/services', routes_service_endpoint_generic)
app.use('/blasts', routes_blasts)
app.use('/servicechains', routes_servicechains)

function forceSSL(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    let secure_url = ['https://', req.get('Host'), req.url].join('')
    winston.debug("Got insecure request, redirecting to " + secure_url)
    return res.redirect(secure_url);
  }
  return next();
}

// Force SSL
if (process.env.NODE_ENV != "production") {
  winston.debug("Not forcing SSL")
} else {
  winston.debug("Forcing SSL redirects")
  app.use(forceSSL)
}

function onServerListening() {
  winston.info("Server listening on " + port)
}
export function initServer() {
  return Promise.try(function () {
    // app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
    //   let err: any = new Error('Not Found');
    //   err.status = 404;
    //   next(err);
    // });

    // error handler
    app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = process.env.NODE_ENV = "development" ? err : {};

      // render the error page
      res.status(err.status || 500);
    });

    return
  })
    .then(function () {
      return db.initialize_database()
    })
    .then(function () {
      // Set up plugin manager
      winston.info("Initing all plugins")
      return PluginManager.initAllPlugins()
    })
    .then(function () {
      return process.env.NODE_ENV == "production" ? app.listen(port, onServerListening) : app.listen(port, "localhost", onServerListening)
    })
}
