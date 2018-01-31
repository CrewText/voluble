var errors = require('common-errors')
var voluble_errors = require('../../bin/voluble-errors')
import db from '../../models'
import * as events from 'events'
import { ContactInstance } from '../../models/contact';
import { MessageInstance } from '../../models/message';
export type contactInstance = ContactInstance
export type messageInstance = MessageInstance


/**
 * The voluble_plugin forms the basis of any given Voluble plugin, and should be extended by any new plugin.
 * This defines the basic methods that must be defined by new plugins, as well as various internal parts of the plugin
 * that Voluble uses for all plugins to work, such as the EventEmitter.
 */

interface IVolublePluginBase {
    name: string | undefined
    description: string | undefined
    plugin_uid: string | undefined
    _eventEmitter: events.EventEmitter

    init(): boolean
    shutdown(): boolean
    send_message(message: MessageInstance, contact: ContactInstance): null | undefined | void
    message_state_update(msg: MessageInstance, message_state: string): null | undefined | void
}

export class voluble_plugin implements IVolublePluginBase {
    name: string
    description: string
    plugin_uid: string
    _eventEmitter: events.EventEmitter

    constructor() {
        this._eventEmitter = new events.EventEmitter()
    }

    init(): boolean {
        throw new errors.NotImplementedError("Plugin " + this.name + " has not defined the function 'init'. Contact the plugin author for a fix.")
    }

    shutdown(): boolean {
        throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
    }

    send_message(message: MessageInstance, contact: ContactInstance): null | undefined | void {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }

    message_state_update(msg: MessageInstance, message_state: string) {
        this._eventEmitter.emit('message-state-update', msg, message_state)
    }
}

// var voluble_plugin_2 = function () {
//     this.name = null
//     this.description = null
//     this.plugin_uid = null
//     this._eventEmitter = new events.EventEmitter()
// }

// /**
//  * This is called by voluble when first initializing the message-sending plugin.
//  * Plugins should scrutinize provided parameters and make sure that is possible to safely
//  * init the plugin, then do so.
//  * If the plugin can be initialized, then `init` should return True.
//  * If not, then return False.
//  */
// voluble_plugin.prototype.init = function () {
//     throw new errors.NotImplementedError("Plugin " + this.name + " has not defined the function 'init'. Contact the plugin author for a fix.")
// }

// /**
//  * This is called by voluble when unloading a plugin (such as when voluble is shutting down.)
//  */
// voluble_plugin.prototype.shutdown = function () {
//     throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
// }

// /**
//  * This is called by voluble when a message needs to be sent.
//  * @param {Sequelize.Message} message_content The Sequelize row of the message to be sent.
//  * @param {Sequelize.Contact} contact The Sequelize row of the contact who we're sending a message to.
//  */
// voluble_plugin.prototype.send_message = function (message_content, contact) {
//     throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
// }

// voluble_plugin.prototype.message_state_update = function (msg, message_state) {
//     this._eventEmitter.emit('message-state-update', msg, message_state, this)
// }

// voluble_plugin.prototype.constructor = voluble_plugin
// module.exports = { voluble_plugin, message, voluble_errors };
