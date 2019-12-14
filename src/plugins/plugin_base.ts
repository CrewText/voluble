import * as db from '../models'
import { EventEmitter } from 'events';
export type contactInstance = db.ContactInstance
export type messageInstance = db.MessageInstance
import { NotImplementedError } from '../voluble-errors'

export interface InterpretedIncomingMessage {
    message_body: string,
    contact_id?: string,
    is_reply_to?: string | null | undefined,
    phone_number?: string,
    email_address?: string
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

export abstract class voluble_plugin implements IVolublePluginBase {
    name: string
    description: string
    _eventEmitter = new EventEmitter()
    _plugin_dir = __dirname

    public get PLUGIN_HOME(): string {
        return this._plugin_dir
    }


    constructor(plugin_name: string, plugin_description: string) {

        // Check for mandatory fields
        this.name = plugin_name
        if (!this.name) {
            throw new NotImplementedError(`Plugin in the following directory has not defined the variable 'plugin_name' in it's constructor: ${__dirname}`)
        }
        this.description = plugin_description
        if (!this.description) {
            throw new NotImplementedError(`Plugin in the following directory has not defined the variable 'plugin_description' in it's constructor: ${__dirname}`)
        }
    }

    abstract async send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean>

    // This could be null, as a Service might not necessarily be notifying the plugin of an inbound message
    abstract async handle_incoming_message(message_data: any): Promise<InterpretedIncomingMessage | null>

    //abstract send_service_message
}