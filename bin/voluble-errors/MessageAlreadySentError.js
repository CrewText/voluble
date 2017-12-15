function MessageAlreadySentError(message) {
    this.message = message
    this.name = "MessageAlreadySentError"
    Error.captureStackTrace(this, MessageAlreadySentError)
}

MessageAlreadySentError.prototype = Object.create(Error.prototype)
MessageAlreadySentError.constructor = MessageAlreadySentError

module.exports = MessageAlreadySentError