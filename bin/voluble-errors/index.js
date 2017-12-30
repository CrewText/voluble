const MessageAlreadySentError = require('./MessageAlreadySentError')
const MessageFailedError = require('./MessageFailedError')
const PluginInitFailedError = require('./PluginInitFailedError')
let Errors = {
    MessageAlreadySentError,
    MessageFailedError,
    PluginInitFailedError,
}

module.exports = Errors