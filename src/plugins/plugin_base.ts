import * as winston from 'winston';
import { Contact } from '../models/contact';
import { Message } from '../models/message';
import { Organization } from '../models/organization';
import { NotImplementedError } from '../voluble-errors';
export type contactInstance = Contact
export type messageInstance = Message
export type orgInstance = Organization

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

// interface IVolublePluginBase {
//     name: string | undefined
//     description: string | undefined
//     // _eventEmitter: EventEmitter
//     send_message(message: Message, contact: Contact): Promise<boolean> | boolean
//     handle_incoming_message(message_data: any): Promise<InterpretedIncomingMessage> | InterpretedIncomingMessage

// }

export abstract class voluble_plugin {
    public name: string
    public description: string
    // _eventEmitter = new EventEmitter()
    public _plugin_dir = __dirname
    logger: winston.Logger

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

        this.logger = winston.loggers.get(process.mainModule.filename).child({ module: `Plugin (${this.name})` })
    }

    abstract async send_message(message: Message, contact: Contact, organization: Organization): Promise<boolean>

    // This could be null, as a Service might not necessarily be notifying the plugin of an inbound message
    abstract async handle_incoming_message(message_data: any): Promise<InterpretedIncomingMessage | null>

    //abstract send_service_message
}