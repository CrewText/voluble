import * as cors from 'cors';
import * as express from "express";
import { Server } from 'http';
import * as winston from 'winston';

import * as db from '../models';
import { PluginManager } from '../plugin-manager';
import { QueueManager } from '../queue-manager';
import routes_auth0_proxy from './routes/auth0-proxy';
import routes_blasts from './routes/blasts';
import routes_categories from './routes/categories';
import routes_contacts from './routes/contacts';
import routes_messages from './routes/messages';
import routes_orgs from './routes/organizations';
import routes_service_endpoint_generic from './routes/service_endpoint';
import routes_servicechains from './routes/servicechains';
import routes_services from './routes/services';
import routes_user_self from './routes/user_self';
import routes_users from './routes/users';
import { serializeTypes } from './serialize-types';

import JSONAPISerializer = require("json-api-serializer");

import path = require('path');
import bodyParser = require('body-parser');
import xmlParser = require('express-xml-bodyparser');

const logger = winston.loggers.add(process.title, {
  format: winston.format.combine(winston.format.json(), winston.format.prettyPrint()),
  defaultMeta: { module: 'Server-Main' }
})
logger.level = process.env.NODE_ENV === "production" ? "info" : "debug"
logger.add(new winston.transports.Console())

logger.info("Loading routes")
logger.info("Starting Express server")
const app = express();

let svr: Server;

// function onError(error: any) {
//   if (error.syscall !== 'listen') {
//     throw error;
//   }

//   var bind = typeof port === 'string'
//     ? 'Pipe ' + port
//     : 'Port ' + port;

//   // handle specific listen errors with friendly messages
//   switch (error.code) {
//     case 'EACCES':
//       console.error(bind + ' requires elevated privileges');
//       process.exit(1);
//       break;
//     case 'EADDRINUSE':
//       console.error(bind + ' is already in use');
//       process.exit(1);
//       break;
//     default:
//       throw error;
//   }
// }

function forceSSL(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    const secure_url = ['https://', req.get('Host'), req.url].join('')
    logger.debug("Got insecure request, redirecting to " + secure_url)
    return res.redirect(secure_url);
  }
  return next();
}

// Force SSL
if (process.env.NODE_ENV != "production") {
  logger.debug("Not forcing SSL")

  app.use((req, res, next) => {
    logger.debug(`Request to: ${req.method.toUpperCase()} ${req.path}`); next()
  })
} else {
  logger.debug("Forcing SSL redirects")
  app.use(forceSSL)
}

export async function initServer(): Promise<Server> {
  const port = parseInt(process.env.PORT, 10) || 5000
  return new Promise((resolve, _rej) => {
    app.set('port', port);

    // uncomment after placing your favicon in /public
    //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(xmlParser({ explicitArray: false }))
    app.use(express.static(path.join(__dirname, 'public')));

    logger.debug("Using cors")
    app.use(cors())

    app.options('*', cors()) // include before other routes

    logger.debug('Setting up routes')
    // app.use('/v1/', routes_index);
    app.use('/v1/users', routes_user_self);
    app.use('/v1/services', routes_services)
    app.use('/v1/services', routes_service_endpoint_generic)
    app.use('/v1/orgs', routes_orgs)
    app.use('/v1/orgs', routes_contacts)
    app.use('/v1/orgs', routes_categories)
    app.use('/v1/orgs', routes_messages)
    app.use('/v1/orgs', routes_blasts)
    app.use('/v1/orgs', routes_servicechains)
    app.use('/v1/orgs', routes_users)
    app.use('/auth0', routes_auth0_proxy)

    // Global error handler
    app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const serialized_err = req.app.locals.serializer.serializeError(err)
      res.status(500).json(serialized_err)
      logger.error(err.message, { "route": req.baseUrl, "method": req.method, "errorName": err.name, stack: err.stack })
    })

    return resolve()
  })
    .then(() => {
      logger.debug("Initializing DB")
      return db.initialize_database()
    })
    .then(() => {
      logger.debug('Serializing models')
      app.locals.serializer = new JSONAPISerializer({ jsonapiObject: false })
      serializeTypes(app.locals.serializer)
      return
    })
    .then(() => {
      // Set up plugin manager
      return Promise.all([PluginManager.initAllPlugins(), QueueManager.createQueues()])
    })
    .then(() => {
      svr = process.env.NODE_ENV == "test" ? app.listen(port, "localhost") : app.listen(port);
      return new Promise<Server>((res, _rej) => {
        svr.once('listening', () => {
          logger.info("Server listening on " + port)
          res(svr)
        })
      })
    })
}

export async function shutdownServer(): Promise<void> {
  // QueueManager.shutdownQueues()

  await new Promise((resolve, _reject) => {
    if (svr) {
      svr.close((err) => {
        if (err) { logger.error(err) }
        resolve()
      })
    }
  })
}