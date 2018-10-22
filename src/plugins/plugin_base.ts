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

/**
 * The voluble_plugin forms the basis of any given Voluble plugin, and should be extended by any new plugin.
 * This defines the basic methods that must be defined by new plugins, as well as various internal parts of the plugin
 * that Voluble uses for all plugins to work, such as the EventEmitter.
 */

interface IVolublePluginBase {
    name: string | undefined
    description: string | undefined
    _eventEmitter: EventEmitter
    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean>
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

        // // And grab the `data_tables` and `object_data_tables` from the manifest
        // if (manifest.hasOwnProperty("data_tables")) {
        //     this.data_tables = manifest["data_tables"]
        // }

        // if (manifest.hasOwnProperty("object_data")) {
        //     this.object_data = manifest["object_data"]
        // }
    }

    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean> {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }

    // populate_object_data_tables(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean> {
    //     // For each object type in `object_data`, find an entry in the appropriate table and pull in the data with ID matching the object ID
    //     if (!this.object_data) {
    //         return Promise.resolve(true)
    //     }

    //     console.log(`PB: Contact Keys:`)
    //     if (this.object_data.contact) {
    //         //let tbl_name = `pl_${this.name.replace(' ', '')}_contacts`
    //         //console.log(contact[`get${tbl_name}`])
    //         console.log(contact.getDataValue(""))
    //         return Promise.resolve(true)
    //     }
    //}
}