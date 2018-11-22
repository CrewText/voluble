"use strict";
function PluginInitFailedError(message) {
    this.message = message;
    this.name = "PluginInitFailedError";
    Error.captureStackTrace(this, PluginInitFailedError);
}
PluginInitFailedError.prototype = Object.create(Error.prototype);
PluginInitFailedError.constructor = PluginInitFailedError;
module.exports = PluginInitFailedError;
