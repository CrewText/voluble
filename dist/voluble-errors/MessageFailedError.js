"use strict";
function MessageFailedError(message) {
    this.message = message;
    this.name = "MessageFailedError";
    Error.captureStackTrace(this, MessageFailedError);
}
MessageFailedError.prototype = Object.create(Error.prototype);
MessageFailedError.constructor = MessageFailedError;
module.exports = MessageFailedError;
