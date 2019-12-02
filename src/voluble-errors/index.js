const MessageAlreadySentError = require('./MessageAlreadySentError')
const MessageFailedError = require('./MessageFailedError')
const PluginDoesNotExistError = require('./PluginDoesNotExistError')
const PluginInitFailedError = require('./PluginInitFailedError')
const PluginFailedToSendError = require('./PluginFailedToSendError')
class UserNotInOrgError extends Error { }
class UserAlreadyInOrgError extends Error { }
class ResourceNotFoundError extends Error { }
class InvalidParameterValueError extends Error { }
let Errors = {
    MessageAlreadySentError,
    MessageFailedError,
    PluginDoesNotExistError,
    PluginInitFailedError,
    PluginFailedToSendError,
    ResourceNotFoundError,
    InvalidParameterValueError,
    UserNotInOrgError,
    UserAlreadyInOrgError
}

module.exports = Errors