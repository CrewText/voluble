import * as BBPromise from 'bluebird';
import * as cors from 'cors';
import * as express from "express";
import { Server } from 'http';
import * as jsend from 'jsend';
import * as winston from 'winston';
import * as db from '../models';
import { PluginManager } from '../plugin-manager';
import { QueueManager } from '../queue-manager';

const path = require('path');
const bodyParser = require('body-parser');
var xmlParser = require('express-xml-bodyparser');

let logger = winston.loggers.add(process.mainModule.filename, {
  format: winston.format.combine(winston.format.json(), winston.format.prettyPrint()),
  level: process.env.NODE_ENV == "production" ? "info" : "debug",
  defaultMeta: { module: 'Server-Main' }
})

logger.add(new winston.transports.Console())

const http = require('https');

logger.info("Loading plugin manager")

logger.info("Loading queue manager")
QueueManager.init_queues()

logger.info("Connecting to database")

logger.info("Loading routes")
const routes_index = require('./routes')
//const routes_users = require('./routes/users')
const routes_orgs = require('./routes/organizations')
const routes_contacts = require('./routes/contacts')
const routes_categories = require('./routes/categories')
const routes_messages = require('./routes/messages')
const routes_services = require('./routes/services')
const routes_blasts = require('./routes/blasts')
const routes_servicechains = require('./routes/servicechains')
const routes_service_endpoint_generic = require('./routes/service_endpoint')

logger.info("Starting Express server")
const app = express();
app.use(jsend.middleware)

let svr: Server;

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

app.use('/v1/', routes_index);
//app.use('/users', routes_users);
app.use('/v1/services', routes_services)
app.use('/v1/services', routes_service_endpoint_generic)
app.use('/v1/orgs', routes_orgs)
app.use('/v1/orgs', routes_contacts)
app.use('/v1/orgs', routes_categories)
app.use('/v1/orgs', routes_messages)
app.use('/v1/orgs', routes_blasts)
app.use('/v1/orgs', routes_servicechains)

function forceSSL(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    let secure_url = ['https://', req.get('Host'), req.url].join('')
    logger.debug("Got insecure request, redirecting to " + secure_url)
    return res.redirect(secure_url);
  }
  return next();
}

// Force SSL
if (process.env.NODE_ENV != "production") {
  logger.debug("Not forcing SSL")
} else {
  logger.debug("Forcing SSL redirects")
  app.use(forceSSL)
}

function onServerListening() {
  logger.info("Server listening on " + port)
}
export function initServer() {
  return BBPromise.try(function () {
    // app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
    //   let err: any = new Error('Not Found');
    //   err.status = 404;
    //   next(err);
    // });

    // error handler
    app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      // set locals, only providing error in development/testing
      res.locals.message = err.message;
      res.locals.error = process.env.NODE_ENV = "production" ? {} : err;

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
      logger.info("Initing all plugins")
      return PluginManager.initAllPlugins()
    })
    .then(function () {
      svr = process.env.NODE_ENV == "test" ? app.listen(port, "localhost", onServerListening) : app.listen(port, onServerListening)
      return svr
    })
}

export async function shutdownServer() {
  QueueManager.shutdownQueues()
  let p = new Promise((resolve, reject) => {
    if (svr) {
      svr.close((err) => {
        if (err) { logger.error(err) }
        resolve()
      })
    }
  })

  await p;
}