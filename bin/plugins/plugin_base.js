var errors = require('common-errors')
var message = require('../messages/message')

var voluble_plugin = {
    name: null,
    description: null,
    plugin_uid: null,
}

/**
 * This is called by voluble when first initializing the message-sending plugin.
 * Plugins should scrutinize provided parameters and make sure that is possible to safely
 * init the plugin, then do so.
 * If the plugin can be initialized, then `init` should return True.
 * If not, then return False.
 */
voluble_plugin.init = function () {
    throw new errors.NotImplementedError("Plugin " + this.name + " has not defined the function 'init'. Contact the plugin author for a fix.")
}

/**
 * This is called by voluble when unloading a plugin (such as when voluble is shutting down.)
 */
voluble_plugin.shutdown = function () {
    throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
}

/**
 * This is called by voluble when a message needs to be sent.
 */
voluble_plugin.send_message = function (message_content, contact) {
    throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
}

module.exports = { voluble_plugin, message };
