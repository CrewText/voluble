import * as fs from 'fs'
import * as path from 'path'
const winston = require('winston')
import * as Promise from "bluebird"
const errs = require('common-errors')
import * as crypto from 'crypto'

import { voluble_plugin } from '../plugins/plugin_base'
import * as db from '../models'
import { MessageManager } from '../message-manager'
import { Sequelize } from 'sequelize';
const voluble_errors = require('../voluble-errors')

interface IPluginIDMap {
    id: number,
    plugin: voluble_plugin
}

/**
 * The PluginManager keeps track of all loaded plugins, as well as initializing, loading and shutting down all detected plugins.
 * It also handles all plugin- and service-related operations.
 */
export namespace PluginManager {
    var __plugin_dir: string = ""
    var __loaded_plugins: Array<IPluginIDMap> = []

    export function getPluginById(id: number): Promise<voluble_plugin> {
        let p: voluble_plugin
        console.log(__loaded_plugins)
        __loaded_plugins.forEach(function (plugin: IPluginIDMap) {
            console.log(`Plugin ID: ${plugin.id}, ${plugin.id == id}`)
            if (plugin.id == id) {
                p = plugin.plugin
            }
        })

        if (!p) {
            return Promise.reject(new errs.NotFoundError("Plugin with ID " + id + " does not exist."))
        } else {
            return Promise.resolve(p)
        }
    }

    export function loadAllPlugins() {
        // Cycle through plugin directory and try to init all available plugins

        // Logic - the plugin's directory is something we should be able to identify it by.
        // SO: We should loop through all of the directories under the plugin directory and see if a plugin exists in the database with that directory.
        // If so, update it's status to not initialized. Otherwise, create it as not initialized.
        // The point of this is so that when plugins are added, they aren't removed and re-added on startup,
        // which could likely lead to a change in ID number in the database when a new plugin is added or an existing one removed.

        // Get a list of all of the directories under the plugin directory
        let plugin_subdirs = fs.readdirSync(__plugin_dir).filter(function (element) {
            let plugin_subdir_fullpath = path.join(__plugin_dir, element)

            if (fs.statSync(plugin_subdir_fullpath).isDirectory()) { return true }
            else { return false }
        })

        winston.debug("Found plugins at:\n\t" + plugin_subdirs)

        // Loop through each directory and try to init a plugin if there is one
        plugin_subdirs.forEach(function (plugin_subdir_rel) {
            let plugin_file_abs = path.join(__plugin_dir, plugin_subdir_rel, "plugin.js")
            if (fs.existsSync(plugin_file_abs)) {

                Promise.try(function () {
                    let plug_obj: voluble_plugin = require(plugin_file_abs)()
                    winston.info("Loaded plugin:\n\t" + plug_obj.name)
                    return plug_obj
                })
                    .then(function (plug_obj) {
                        // We've found the plugin file, so now let's update the database to match.
                        return db.models.Service.findOne({
                            where: { 'directory_name': plugin_subdir_rel }
                        })
                            .then(function (svc) {
                                if (!svc) {
                                    // This plugin doesn't exist in the database, so let's add an entry for it
                                    return db.models.Service.create({
                                        'name': plug_obj.name,
                                        'directory_name': plugin_subdir_rel,
                                        'initialized': false
                                    })
                                } else {
                                    // This plugin does exist, but let's make sure that Voluble doesn't think it's ready yet
                                    svc.initialized = false
                                    return svc.save()
                                }
                            })
                            // So now that the plugin exists in the database, let's try and make it work
                            .then(function (svc: db.ServiceInstance) {
                                if (plug_obj.init()) {
                                    let p: IPluginIDMap = { id: svc.id, plugin: plug_obj }
                                    __loaded_plugins.push(p)
                                    console.log("Inited plugin " + svc.id + ": " + plug_obj.name)
                                    svc.initialized = true

                                    // Add event listeners, so Voluble can react to message state changes
                                    plug_obj._eventEmitter.on('message-state-update', function (msg: db.MessageInstance, message_state: string){
                                        //MessageManager.updateMessageState(msg, message_state, svc)
                                    })

                                    return svc.save()
                                } else {
                                    throw new voluble_errors.PluginInitFailedError("Failed to init " + plug_obj.name)
                                }
                            })
                            .catch(voluble_errors.PluginInitFailedError, function (err: any) {
                                winston.error(err.message)
                            })
                    })
                    .catch(function (err) {
                        winston.error("Failed to load plugin: " + plugin_file_abs + "\nMessage: " + err.message)
                    })
            } else {
                winston.info("No plugin in\n\t" + path.join(__plugin_dir, plugin_subdir_rel))
            }
        })

    }

    /**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
    export function initAllPlugins(plugin_dir: string) {
        winston.debug("Attempting to load plugins from " + plugin_dir)
        __plugin_dir = path.resolve(plugin_dir || path.join(__dirname, "../../plugins"))
        winston.info("Loading plugins from\n\t" + plugin_dir)
        loadAllPlugins()
    }


    /**
     * For each loaded plugin, call it's `shutdown()` function.
     */
    export function shutdownAllPlugins() {

        db.models.Service.findAll({
            where: { initialized: true }
        })
            .then(function (svcs: db.ServiceInstance[]) {
                Promise.map(svcs, function (svc: db.ServiceInstance) {
                    return PluginManager.getPluginById(svc.id)
                        .then(function (plugin) {
                            plugin.shutdown()
                            plugin._eventEmitter.removeAllListeners()

                            let i = 0
                            __loaded_plugins.forEach(element => {
                                if (element.plugin == plugin) {
                                    i = __loaded_plugins.indexOf(element)
                                }
                            });
                            if (i > -1) { __loaded_plugins.splice(i, 1) }
                            svc.initialized = false
                            return svc.save()
                        })
                })
            })
            .catch(function (err: any) {
                winston.error(err.message)
            })
    }

    /**
     * Gets the list of services from the DB with their status.
     * @returns {array <Sequelize.Plugin>} An array of Sequelize rows representing loaded services.
     */

    export function getAllServices(): Promise<db.ServiceInstance[]> {
        return db.models.Service.findAll()
    }

    /**
     * Gets a single service from the DB by its' ID.
     * @param {Number} id The ID of the service to find.
     * @returns {Sequelize.Plugin} The row representing the plugin with a given ID.
     */
    export function getServiceById (id: number): Promise<db.ServiceInstance | null> {
        return db.models.Service.findById(id)
        // TODO: Validate plugin exists, fail otherwise
    }

    function createPluginDataTables(service: db.ServiceInstance, table_names: string[]): Promise<any[]>{
        // `data_structure` must be laid out as follows:
        // { table_name: { columnOne: typeName, columnTwo: typeName }, ... }
        
        let prefix = createPluginDataTablePrefix(service.directory_name)
        return Promise.map(Object.keys(table_names), function(table){
            return db.sequelize.define(`${prefix}_${table}`,{})
        })
    }

    function createPluginDataTablePrefix(plugin_dir:string):string{
        return crypto.createHash('md5').update(plugin_dir).digest('base64')
    }
}