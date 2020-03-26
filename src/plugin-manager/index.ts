import * as fs from 'fs'
import * as path from 'path'
import * as winston from 'winston'
import * as db from '../models'
import { Service } from '../models/service'
import { voluble_plugin } from '../plugins/plugin_base'
import { ResourceNotFoundError } from '../voluble-errors'

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'PluginMgr' })

interface IPluginDirectoryMap {
    subdirectory: string,
    plugin: voluble_plugin
}

/**
 * The PluginManager keeps track of all loaded plugins, as well as initializing, loading and shutting down all detected plugins.
 * It also handles all plugin- and service-related operations.
 */
export namespace PluginManager {
    export class PluginImportFailedError extends Error { }
    export class ServiceNotFoundError extends Error { }

    let __plugin_dir: string = path.resolve(path.join(__dirname, "../plugins"))

    export async function getPluginById(id: string): Promise<voluble_plugin> {
        /** Find a service relating to a given plugin by it's ID.
         * If a service is found, create a new instance of that plugin and return it
         */

        return new Promise<voluble_plugin>(async (resolve, reject) => {
            let svc = await db.models.Service.findByPk(id)

            if (!svc) {
                reject(new ResourceNotFoundError(`Plugin with ID ${id} cannot be found`))
            }

            try {
                let plugin_directory = path.join(__plugin_dir, svc.directory_name)
                let plugin_fullpath = path.join(plugin_directory, "plugin.js")
                logger.debug("Importing plugin", { plugin_dir: plugin_fullpath })
                let p: voluble_plugin = require(plugin_fullpath)()
                p._plugin_dir = plugin_directory
                resolve(p)
            } catch (e) {
                logger.error(e, `Could not import plugin in directory '${svc.directory_name}': ${e.message}`)
                reject(new PluginImportFailedError(`Failed to import plugin in directory ${svc.directory_name}`))
            }
        })


    }

    export async function getServiceByDirName(dir_name: string): Promise<Service | null> {
        return await db.models.Service.findOne({
            where: { directory_name: dir_name }
        })
    }


    /**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
    export async function initAllPlugins() {
        logger.debug("Attempting to load plugins from " + __plugin_dir)
        logger.info("Loading plugins from" + __plugin_dir)

        let plugin_subdir_list = discoverPlugins(__plugin_dir)
        let plugin_map = await plugin_subdir_list.then((plugin_subdirs) => {
            let plugin_object_map: IPluginDirectoryMap[] = []

            plugin_subdirs.forEach(plugin_subdir => {
                let plugin_file_abs = path.join(__plugin_dir, plugin_subdir, "plugin.js")
                try {
                    let plug_obj: voluble_plugin = require(plugin_file_abs)()
                    logger.info("Loaded plugin: " + plug_obj.name)
                    // plug_obj._eventEmitter.on('message-state-update', (msg: MessageModel, message_state: string) => {
                    //     QueueManager.addMessageStateUpdateRequest(msg.id, message_state)
                    // })

                    let p: IPluginDirectoryMap = { plugin: plug_obj, subdirectory: plugin_subdir }
                    plugin_object_map.push(p)
                } catch (e) {
                    logger.error(e, `Could not load plugin in subdirectory ${plugin_subdir}: ${e.message}`)
                }
            });
            return plugin_object_map
        })

        synchronizePluginDatabase(plugin_map)
    }

    async function discoverPlugins(directory: string): Promise<string[]> {
        // Cycle through plugin directory and return a list of all of the valid subdirectories containing plugins

        // Get a list of all of the directories under the plugin directory
        return new Promise<string[]>((resolve, reject) => {
            fs.readdir(directory, (err, files) => {
                if (err) { reject(err); return }
                resolve(files)
            })
        })
            .then((files) => {
                return files.filter((f) => {
                    let plugin_subdir_fullpath = path.join(directory, f)
                    if (fs.statSync(plugin_subdir_fullpath).isDirectory() && fs.existsSync(path.join(plugin_subdir_fullpath, "plugin.js"))) { return true }
                    else { return false }
                })
            })
            .then((plugin_subdirs) => {
                logger.debug("Found plugins in", { dirs: plugin_subdirs })
                return plugin_subdirs
            })
        // let plugin_subdirs = fs.readdirSync(directory).filter(function (element) {
        //     let plugin_subdir_fullpath = path.join(directory, element)

        //     if (fs.statSync(plugin_subdir_fullpath).isDirectory() && fs.existsSync(path.join(plugin_subdir_fullpath, "plugin.js"))) { return true }
        //     else { return false }
        // })

        // logger.debug("Found plugin", { dirs: plugin_subdirs })

        // return Promise.resolve(plugin_subdirs)
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


    /**
     * Gets the list of services from the DB with their status.
     * @returns {Promise<Service[]>} An array of Sequelize rows representing loaded services.
     */

    export async function getAllServices(): Promise<Service[]> {
        return db.models.Service.findAll({ order: [['createdAt', 'DESC']] })
    }

    /**
     * Gets a single service from the DB by its' ID.
     * @param {string} id The ID of the service to find.
     * @returns {Sequelize.Plugin} The row representing the plugin with a given ID.
     */
    export async function getServiceById(id: string): Promise<Service | null> {
        return db.models.Service.findByPk(id)
    }
}