var errors = require('common-errors')
import * as db from '../models'
import * as events from 'events'
import * as Promise from 'bluebird'
import { EventEmitter } from 'events';
export type contactInstance = db.ContactInstance
export type messageInstance = db.MessageInstance

// interface ObjectData {
//     message?: string[],
//     organization?: string[],
//     user?: string[],
//     contact?: string[]
// }

interface Manifest {
    plugin_name: string,
    plugin_description: string,
    // data_tables?: Object,
    // object_data?: ObjectData,
    npm_modules?: string[]
}

export interface InterpretedIncomingMessage {
    message_body: string,
    contact: string,
    is_reply_to: number | null | undefined,
}

/**
 * The voluble_plugin forms the basis of any given Voluble plugin, and should be extended by any new plugin.
 * This defines the basic methods that must be defined by new plugins, as well as various internal parts of the plugin
 * that Voluble uses for all plugins to work, such as the EventEmitter.
 */

interface IVolublePluginBase {
    name: string | undefined
    description: string | undefined
    _eventEmitter: EventEmitter
    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean> | boolean
    handle_incoming_message(message_data: any): Promise<InterpretedIncomingMessage> | InterpretedIncomingMessage
}

export class voluble_plugin implements IVolublePluginBase {
    name: string
    description: string
    // data_tables: Object | undefined
    // object_data: ObjectData | undefined
    _eventEmitter = new EventEmitter()
    _plugin_dir = __dirname

    public get PLUGIN_HOME(): string {
        return this._plugin_dir
    }


    constructor(manifest: Manifest) {

        // Populate the mandatory plugin fields
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
    }

    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean> | boolean {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }

    handle_incoming_message(message_data: any): Promise<InterpretedIncomingMessage> | InterpretedIncomingMessage {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined the `handle_incoming_message` method. Contact the plugin author for a fix.');
    }
}