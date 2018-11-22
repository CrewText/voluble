"use strict";
function PluginFailedToSendError(message) {
    this.message = message;
    this.name = "PluginFailedToSendError";
    Error.captureStackTrace(this, PluginFailedToSendError);
}
PluginFailedToSendError.prototype = Object.create(Error.prototype);
PluginFailedToSendError.constructor = PluginFailedToSendError;
module.exports = PluginFailedToSendError;
