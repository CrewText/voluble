var errors = require('common-errors')
//var voluble_errors = require('../../bin/voluble-errors')
import * as db from '../models'
import * as events from 'events'
export type contactInstance = db.ContactInstance
export type messageInstance = db.MessageInstance

interface Manifest {
    plugin_name: string,
    plugin_description: string,
    data_tables?: Object,
    npm_modules?: string[]
}

/**
 * The voluble_plugin forms the basis of any given Voluble plugin, and should be extended by any new plugin.
 * This defines the basic methods that must be defined by new plugins, as well as various internal parts of the plugin
 * that Voluble uses for all plugins to work, such as the EventEmitter.
 */

interface IVolublePluginBase {
    name: string | undefined
    description: string | undefined
    _eventEmitter: events.EventEmitter

    send_message(message: db.MessageInstance, contact: db.ContactInstance): boolean
    message_state_update(msg: db.MessageInstance, message_state: string): null | undefined | void
}

export class voluble_plugin implements IVolublePluginBase {
    name: string
    description: string
    _eventEmitter: events.EventEmitter
    data_tables: Object | undefined

    constructor(manifest: Manifest) {
        this._eventEmitter = new events.EventEmitter()

        if (manifest.hasOwnProperty("plugin_name")) {
            this.name = manifest["plugin_name"]
        } else {
            throw new errors.NotImplementedError(`Plugin in the following directory has not defined the field 'plugin_name' in it's manifest: ${__dirname}`)
        }

        if (manifest.hasOwnProperty("plugin_description")) {
            this.description = manifest["plugin_description"]
        } else {
            throw new errors.NotImplementedError(`Plugin ${this.name} has not defined the field 'plugin_description' in it's manifest.`)
        }

        if (manifest.hasOwnProperty("data_tables")) {
            this.data_tables = manifest["data_tables"]
        }

    }

    send_message(message: db.MessageInstance, contact: db.ContactInstance): boolean {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }

    message_state_update(msg: db.MessageInstance, message_state: string) {
        this._eventEmitter.emit('message-state-update', msg, message_state)
    }
}