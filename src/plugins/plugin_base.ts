var errors = require('common-errors')
//var voluble_errors = require('../../bin/voluble-errors')
import * as db from '../models'
import * as events from 'events'
export type contactInstance = db.ContactInstance
export type messageInstance = db.MessageInstance


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

    shutdown(): boolean
    send_message(message: db.MessageInstance, contact: db.ContactInstance): boolean
    message_state_update(msg: db.MessageInstance, message_state: string): null | undefined | void
}

export class voluble_plugin implements IVolublePluginBase {
    name: string = ""
    description: string = ""
    plugin_uid: string = ""
    _eventEmitter: events.EventEmitter

    constructor() {
        this._eventEmitter = new events.EventEmitter()
    }

    shutdown(): boolean {
        throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
    }

    send_message(message: db.MessageInstance, contact: db.ContactInstance): boolean {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }

    message_state_update(msg: db.MessageInstance, message_state: string) {
        this._eventEmitter.emit('message-state-update', msg, message_state)
    }
}