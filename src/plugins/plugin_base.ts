var errors = require('common-errors')
import * as db from '../models'
import * as events from 'events'
import * as Promise from 'bluebird'
export type contactInstance = db.ContactInstance
export type messageInstance = db.MessageInstance

interface ObjectData {
    message?: string[],
    organization?: string[],
    user?: string[],
    contact?: string[]
}

interface Manifest {
    plugin_name: string,
    plugin_description: string,
    data_tables?: Object,
    object_data?: ObjectData,
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

    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean>
}

export class voluble_plugin implements IVolublePluginBase {
    name: string
    description: string
    _eventEmitter: events.EventEmitter
    data_tables: Object | undefined
    object_data: ObjectData = {}

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

        // insert information into object_data
        if (manifest.object_data) {
            let db_define_proms: Promise<any>[] = []

            Object.keys(manifest.object_data).forEach(object_type => {
                let cols = {
                    id: {
                        type: db.models.Sequelize.INTEGER,
                        primaryKey: true,
                    }
                }

                manifest.object_data[object_type].forEach(attr => {
                    cols[attr] = db.models.Sequelize.STRING
                });

                let table_name = `pl_${this.name.replace(' ', '')}_${object_type}`

                // For the sake of convenience, since we know that our table is referencing a particulary entry in a table
                // that alreasy exists, we can set up the foreign keys too. This will help us populate the `plugin.object_data` field later.
                let related_model
                switch (object_type) {
                    case "message":
                        related_model = db.models.Message
                        break
                    case "contact":
                        related_model = db.models.Contact
                        break
                    case "organization":
                        related_model = db.models.Organization
                        break
                    case "user":
                        related_model = db.models.User
                        break
                }

                let model = db.sequelize.define(table_name, cols)
                if (related_model) {
                    related_model.hasOne(model, {foreignKey: "object_id" })
                }
                let prom = model.sync()
                db_define_proms.push(prom)
            });

            Promise.all(db_define_proms)

            // We should actually populate these fields now...
        }
    }

    send_message(message: db.MessageInstance, contact: db.ContactInstance): Promise<boolean> {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }
}