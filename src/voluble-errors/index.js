const MessageAlreadySentError = require('./MessageAlreadySentError')
const MessageFailedError = require('./MessageFailedError')
const PluginDoesNotExistError = require('./PluginDoesNotExistError')
const PluginInitFailedError = require('./PluginInitFailedError')
const PluginFailedToSendError = require('./PluginFailedToSendError')
let Errors = {
    MessageAlreadySentError,
    MessageFailedError,
    PluginDoesNotExistError,
    PluginInitFailedError,
    PluginFailedToSendError
}

module.exports = Errors