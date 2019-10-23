import * as fs from 'fs'
import * as path from 'path'
const winston = require('winston')
// import * as Promise from "bluebird"
const errs = require('common-errors')

import { voluble_plugin } from '../plugins/plugin_base'
import * as db from '../models'
import { QueueManager } from '../queue-manager';
const voluble_errors = require('../voluble-errors')

interface IPluginDirectoryMap {
    subdirectory: string,
    plugin: voluble_plugin
}

/**
 * The PluginManager keeps track of all loaded plugins, as well as initializing, loading and shutting down all detected plugins.
 * It also handles all plugin- and service-related operations.
 */
export namespace PluginManager {
    export const PluginImportFailedError = errs.helpers.generateClass('PluginImportFailedError')
    export class ServiceNotFoundError extends Error { }

    let __plugin_dir: string = path.resolve(path.join(__dirname, "../plugins"))

    export async function getPluginById(id: string): Promise<voluble_plugin> {
        /** Find a service relating to a given plugin by it's ID.
         * If a service is found, create a new instance of that plugin and return it
         */

        return new Promise<voluble_plugin>(async (resolve, reject) => {
            let svc = await db.models.Service.findById(id)

            if (!svc) {
                reject(new errs.NotFoundError(`Plugin with ID ${id} cannot be found`))
            }

            try {
                let plugin_directory = path.join(__plugin_dir, svc.directory_name)
                let plugin_fullpath = path.join(plugin_directory, "plugin.js")
                winston.debug("PM: Importing plugin from:" + plugin_fullpath)
                let p: voluble_plugin = require(plugin_fullpath)()
                p._plugin_dir = plugin_directory
                resolve(p)
            } catch (e) {
                errs.log(e, `Could not import plugin in directory '${svc.directory_name}': ${e.message}`)
                reject(new PluginImportFailedError(`Failed to import plugin in directory ${svc.directory_name}`))
            }
        })


    }

    export async function getServiceByDirName(id: string): Promise<db.ServiceInstance | null> {
        return await db.models.Service.find({
            where: { directory_name: id }
        })
    }


    /**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
    export async function initAllPlugins() {
        winston.debug("PM: Attempting to load plugins from " + __plugin_dir)
        winston.info("PM: Loading plugins from\n\t" + __plugin_dir)

        let plugin_subdir_list = discoverPlugins(__plugin_dir)
        let plugin_map = await plugin_subdir_list.then((plugin_subdirs) => {
            let plugin_object_map: IPluginDirectoryMap[] = []

            plugin_subdirs.forEach(plugin_subdir => {
                let plugin_file_abs = path.join(__plugin_dir, plugin_subdir, "plugin.js")
                try {
                    let plug_obj: voluble_plugin = require(plugin_file_abs)()
                    winston.info("PM: Loaded plugin: " + plug_obj.name)
                    plug_obj._eventEmitter.on('message-state-update', (msg: db.MessageInstance, message_state: string) => {
                        QueueManager.addMessageStateUpdateRequest(msg.id, message_state)
                    })

                    let p: IPluginDirectoryMap = { plugin: plug_obj, subdirectory: plugin_subdir }
                    plugin_object_map.push(p)
                } catch (e) {
                    errs.log(e, `Could not load plugin in subdirectory ${plugin_subdir}: ${e.message}`)
                }
            });

            return plugin_object_map
        })

        synchronizePluginDatabase(plugin_map)
    }

    async function discoverPlugins(directory: string): Promise<string[]> {
        // Cycle through plugin directory and return a list of all of the valid subdirectories containing plugins

        // Get a list of all of the directories under the plugin directory
        let plugin_subdirs = fs.readdirSync(directory).filter(function (element) {
            let plugin_subdir_fullpath = path.join(directory, element)

            if (fs.statSync(plugin_subdir_fullpath).isDirectory() && fs.existsSync(path.join(plugin_subdir_fullpath, "plugin.js"))) { return true }
            else { return false }
        })

        winston.debug("PM: Found plugins at:\n\t" + plugin_subdirs)

        return Promise.resolve(plugin_subdirs)
    }

    function synchronizePluginDatabase(plugin_list: IPluginDirectoryMap[]) {
        plugin_list.map(async (current_plugin_map) => {
            let service = await db.models.Service.findOne({
                where: { 'directory_name': current_plugin_map.subdirectory }
            })

            if (!service) {
                // This plugin doesn't exist in the database, so let's add an entry for it
                service = await db.models.Service.create({
                    'name': current_plugin_map.plugin.name,
                    'directory_name': current_plugin_map.subdirectory,
                })
            }
        })
    }

    // function createPluginDataTables(plugin_dir_map: IPluginDirectoryMap): Promise<any[]> {
    //     if (plugin_dir_map.plugin.data_tables) {
    //         return Promise.map(Object.keys(plugin_dir_map.plugin.data_tables), function (table) {
    //             let table_name = `pl_${plugin_dir_map.subdirectory}_${table}`
    //             winston.info(`Creating table ${table_name}`)

    //             let cols = {}
    //             let current_table: string[] = plugin_dir_map.plugin.data_tables[table]

    //             winston.debug(current_table)
    //             //console.log(current_table)

    //             current_table.forEach(function (col) {
    //                 cols[col] = db.models.Sequelize.STRING
    //             })

    //             db.sequelize.define(table_name, cols).sync()

    //         })
    //     } else {
    //         return Promise.resolve([])
    //     }
    // }

    // function createPluginObjectDataTables(plugin_dir_map: IPluginDirectoryMap): Promise<any> {
    //     let plugin = plugin_dir_map.plugin
    //     let db_define_proms: Promise<any>[] = []

    //     Object.keys(plugin.object_data).forEach(object_type => {
    //         let cols = {
    //             id: {
    //                 type: db.models.Sequelize.INTEGER,
    //                 primaryKey: true,
    //             }
    //         }

    //         plugin.object_data[object_type].forEach(attr => {
    //             cols[attr] = db.models.Sequelize.STRING
    //         });

    //         let table_name = `pl_${plugin.name.replace(' ', '')}_${object_type}`

    //         // For the sake of convenience, since we know that our table is referencing a particulary entry in a table
    //         // that alreasy exists, we can set up the foreign keys too. This will help us populate the `plugin.object_data` field later.
    //         let related_model
    //         switch (object_type) {
    //             case "message":
    //                 related_model = db.models.Message
    //                 break
    //             case "contact":
    //                 related_model = db.models.Contact
    //                 break
    //             case "organization":
    //                 related_model = db.models.Organization
    //                 break
    //             case "user":
    //                 related_model = db.models.User
    //                 break
    //         }

    //         let model = db.sequelize.define(table_name, cols)
    //         if (related_model) {
    //             related_model.hasOne(model, { foreignKey: "object_id" })
    //         }
    //         let prom = model.sync()
    //         db_define_proms.push(prom)
    //     });

    //     return Promise.all(db_define_proms)
    // }

    /**
     * Gets the list of services from the DB with their status.
     * @returns {Promise<db.ServiceInstance[]>} An array of Sequelize rows representing loaded services.
     */

    export async function getAllServices(): Promise<db.ServiceInstance[]> {
        return db.models.Service.findAll()
    }

    /**
     * Gets a single service from the DB by its' ID.
     * @param {string} id The ID of the service to find.
     * @returns {Sequelize.Plugin} The row representing the plugin with a given ID.
     */
    export async function getServiceById(id: string): Promise<db.ServiceInstance | null> {
        return db.models.Service.findById(id)
    }
}