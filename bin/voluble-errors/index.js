const MessageAlreadySentError = require('./MessageAlreadySentError')
const MessageFailedError = require('./MessageFailedError')
const PluginDoesNotExistError = require('./PluginDoesNotExistError')
const PluginInitFailedError = require('./PluginInitFailedError')
let Errors = {
    MessageAlreadySentError,
    MessageFailedError,
    PluginDoesNotExistError,
    PluginInitFailedError,
}

module.exports = Errors