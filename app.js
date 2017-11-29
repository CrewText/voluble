// @ts-check
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const winston = require('winston')
winston.level = 'debug'
const http = require('http');

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
const pluginManager = require("./bin/plugin-manager/plugin-manager")

winston.info("Loading message manager")
const messageManager = require('./bin/message-manager/message-manager')

winston.info("Loading user settings")
const user_settings = require('./user_settings.json')


winston.info("Starting Express server")
const app = express();
app.locals.db_credentials = user_settings.db_credentials

/**
 * Get port from environment and store in Express.
 */
function normalizePort(val) {
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

function onError(error) {
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

var server = http.createServer(app);

server.listen(port);
server.on('error', onError);

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
pluginManager.initAllPlugins(user_settings.plugin_directory)


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
