const fs = require('fs')
const path = require('path');
const winston = require('winston')
const Promise = require('bluebird')

var PluginManager = {
    plugin_dir: "",
    totalPluginsList: [],
    availablePlugins: [],

    getPluginById: function (id) {
        // TODO: Implement getPluginFromID properly
        return Promise.try(function () {
            //return PluginManager.availablePlugins[id]
            if (id == 0) {
                return PluginManager.availablePlugins[0]
            }
            else { throw new Error("Plugin with id " + id + " does not exist") }
        })
    },

    /**
    * For all of the existent plugins in the plugin directory, try and init each one
    * If this is successful, add the plugin to the list `availablePLugins`.
    */

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
        plugin_subdirs.forEach(function (plugin_subir_rel) {
            let plugin_file_abs = path.join(PluginManager.plugin_dir, plugin_subir_rel, "plugin.js")
            if (fs.existsSync(plugin_file_abs)) {
                try {
                    let plug_obj = require(plugin_file_abs)()
                    winston.info("Loaded plugin:\n\t" + plug_obj.name)
                    PluginManager.totalPluginsList.push(plug_obj)
                    plug_obj.init()
                    PluginManager.availablePlugins.push(plug_obj)
                } catch (err) {
                    winston.error("Failed to load plugin: " + plugin_file_abs + "\nMessage: " + err.message)
                }
            } else {
                winston.info("No plugin in\n\t" + path.join(PluginManager.plugin_dir, plugin_subir_rel))
            }
        })

    }
}

/**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
PluginManager.initAllPlugins = function (plugin_dir) {
    winston.debug("Attempting to load plugins")
    this.plugin_dir = plugin_dir
    this.loadAllPlugins()
}


/**
 * For each loaded plugin, call it's `shutdown()` function.
 */
PluginManager.shutdownAllPlugins = function () {
    try {
        this.availablePlugins.forEach(function (plugin) {
            plugin.shutdown()
        })
    } catch (e) {
        console.log(e)
    }
}

module.exports = PluginManager