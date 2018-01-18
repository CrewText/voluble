var errors = require('common-errors')
var voluble_errors = require('../../bin/voluble-errors')
var db = require('../../models')
var message = db.sequelize.model('Message')
const events = require('events')


/**
 * The voluble_plugin forms the basis of any given Voluble plugin, and should be extended by any new plugin.
 * This defines the basic methods that must be defined by new plugins, as well as various internal parts of the plugin
 * that Voluble uses for all plugins to work, such as the EventEmitter.
 */
// var voluble_plugin = {
//     name: null,
//     description: null,
//     plugin_uid: null,
//     _eventEmitter: new events.EventEmitter(),
// }

var voluble_plugin = function () {
    this.name = null
    this.description = null
    this.plugin_uid = null
}

/**
 * This is called by voluble when first initializing the message-sending plugin.
 * Plugins should scrutinize provided parameters and make sure that is possible to safely
 * init the plugin, then do so.
 * If the plugin can be initialized, then `init` should return True.
 * If not, then return False.
 */
// voluble_plugin.init = function () {
voluble_plugin.prototype.init = function () {
    throw new errors.NotImplementedError("Plugin " + this.name + " has not defined the function 'init'. Contact the plugin author for a fix.")
}

/**
 * This is called by voluble when unloading a plugin (such as when voluble is shutting down.)
 */
// voluble_plugin.shutdown = function () {
voluble_plugin.prototype.shutdown = function () {
    throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
}

/**
 * This is called by voluble when a message needs to be sent.
 * @param {Sequelize.Message} message_content The Sequelize row of the message to be sent.
 * @param {Sequelize.Contact} contact The Sequelize row of the contact who we're sending a message to.
 */
// voluble_plugin.send_message = function (message_content, contact) {
voluble_plugin.prototype.send_message = function (message_content, contact) {
    throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
}

voluble_plugin.prototype._eventEmitter = new events.EventEmitter()

// voluble_plugin.message_state_update= function (msg, message_state) {
voluble_plugin.prototype.message_state_update = function (msg, message_state) {
    // voluble_plugin._eventEmitter.emit('message-state-update', msg, message_state)
    this._eventEmitter.emit('message-state-update', msg, message_state)
}

voluble_plugin.prototype.constructor = voluble_plugin
module.exports = { voluble_plugin, message, voluble_errors };
