const fs = require('fs')
const path = require('path');
const winston = require('winston')
const Promise = require('bluebird')
const db = require('../../models')
const voluble_errors = require('../voluble-errors')

var PluginManager = {
    plugin_dir: "",
    loaded_plugins: [],

    getPluginById: function (id) {
        let p = null
        PluginManager.loaded_plugins.forEach(function (plugin) {
            if (plugin[0] == id) {
                p = plugin[1]
            }
        })

        if (!p){
            throw new Error("Plugin with ID " + id + " does not exist.")
        } else {
            return p
        }
    },


    loadAllPlugins: function () {
        // Cycle through plugin directory and try to init all available plugins

        /**
         * Logic - the plugin's directory is something we should be able to identify it by.
         * SO: We should loop through all of the directories under the plugin directory and see if a plugin exists in the database with that directory.
         * If so, update it's status to not initialized. Otherwise, create it as not initialized.
         * The point of this is so that when plugins are added, they aren't removed and re-added on startup, which could likely lead to a change in ID number in the database when a new plugin is added or an existing one removed.
         */

        // Get a list of all of the directories under the plugin directory
        let plugin_subdirs = fs.readdirSync(PluginManager.plugin_dir).filter(function (element) {
            let plugin_subdir_fullpath = path.join(PluginManager.plugin_dir, element)

            if (fs.statSync(plugin_subdir_fullpath).isDirectory()) { return true }
            else { return false }
        })

        winston.debug("Found plugins at:\n\t" + plugin_subdirs)

        // Loop through each directory and try to init a plugin if there is one
        plugin_subdirs.forEach(function (plugin_subdir_rel) {
            let plugin_file_abs = path.join(PluginManager.plugin_dir, plugin_subdir_rel, "plugin.js")
            if (fs.existsSync(plugin_file_abs)) {
                try {
                    let plug_obj = require(plugin_file_abs)()
                    winston.info("Loaded plugin:\n\t" + plug_obj.name)

                    // We've found the plugin file, so now let's update the database to match.
                    db.sequelize.model("Plugin").findOne({
                        where: { 'directory_name': plugin_subdir_rel }
                    }).then(function (row) {
                        if (!row) {
                            // This plugin doesn't exist in the database, so let's add an entry for it
                            return db.sequelize.model('Plugin').create({
                                'name': plug_obj.name,
                                'directory_name': plugin_subdir_rel,
                                'initialized': false
                            })
                        } else {
                            // This plugin does exist, but let's make sure that Voluble doesn't think it's ready yet
                            row.initialized = false
                            return row.save()
                        }
                    })
                        // So now that the plugin exists in the database, let's try and make it work
                        .then(function (row) {
                            if (plug_obj.init()) {
                                PluginManager.loaded_plugins.push([row.id, plug_obj])
                                console.log("Inited plugin " + row.id + ": " + plug_obj.name)
                                row.initialized = true
                                return row.save()
                            } else {
                                throw new voluble_errors.PluginInitFailedError("Failed to init " + plug_obj.name)
                            }
                        })
                        .catch(voluble_errors.PluginInitFailedError, function (err) {
                            winston.error(err.message)
                        })
                } catch (err) {
                    winston.error("Failed to load plugin: " + plugin_file_abs + "\nMessage: " + err.message)
                }
            } else {
                winston.info("No plugin in\n\t" + path.join(PluginManager.plugin_dir, plugin_subdir_rel))
            }
        })

    },

    /**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
    initAllPlugins: function (plugin_dir) {
        winston.debug("Attempting to load plugins")
        this.plugin_dir = plugin_dir || path.join(__dirname, "../plugins")
        winston.info("Loading plugins from\n\t"+ this.plugin_dir)
        this.loadAllPlugins()
    },


    /**
     * For each loaded plugin, call it's `shutdown()` function.
     */
    shutdownAllPlugins: function () {

        db.sequelize.model('Plugin').findAll({
            where: { initialized: true }
        })
            .then(function (rows) {
                Promise.map(rows, function (row) {
                    let plugin = PluginManager.getPluginById(row.id)
                    plugin.shutdown()
                    let index = PluginManager.loaded_plugins.indexOf(plugin)
                    if (index > -1) { PluginManager.loaded_plugins.splice(index, 1) }
                    row.initialized = false
                    return row.save()
                })
            })
            .catch(function (err) {
                winston.error(err.message)
            })
    },

    /**
     * Gets the list of plugins from the DB with their status
     */

    getAllPlugins: function () {
        return db.sequelize.model('Plugin').findAll()
    },

    getPluginInfoById: function (id) {
        return db.sequelize.model('Plugin').findOne({ where: { id: id } })
        // TODO: Validate plugin exists, fail otherwise
    }

}

module.exports = PluginManager