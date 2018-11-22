"use strict";
function PluginDoesNotExistError(message) {
    this.message = message;
    this.name = "PluginDoesNotExistError";
    Error.captureStackTrace(this, PluginDoesNotExistError);
}
PluginDoesNotExistError.prototype = Object.create(Error.prototype);
PluginDoesNotExistError.constructor = PluginDoesNotExistError;
module.exports = PluginDoesNotExistError;
