const fs = require('fs')
const winston = require('winston')
const Promise = require('bluebird')

var PluginManager = {
    plugin_dir: "",
    totalPluginsList: [],
    availablePlugins: [],

    getPluginById: function (id){
        // TODO: Implement getPluginFromID properly
        return Promise.try(function(){
            //return PluginManager.availablePlugins[id]
            if (id == 0){
                return PluginManager.availablePlugins[0]}
            else{throw new Error("Plugin with id "+id+" does not exist")}
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
 * For all of the existent plugins in the plugin directory, try and init each one
 * If this is successful, add the plugin to the list `availablePLugins`.
 */
PluginManager.loadAllPlugins = function () {
    // Cycle through plugin directory and try to init all available plugins
    // FIXME: make loadAllPlugins actually work, and loop through stuff! #1
    let esendexPlugin = require("../plugins/esendex/plugin")
    let plug = esendexPlugin.createPlugin()
    this.availablePlugins.push(plug)
    plug.init()


    /**
     * Logic - the plugin's directory is something we should be able to identify it by.
     * SO: We should loop through all of the directories under the plugin directory and see if a plugin exists in the database with that directory.
     * If so, update it's status to not initialized. Otherwise, create it as not initialized.
     * The point of this is so that when plugins are added, they aren't removed and re-added on startup, which could likely lead to a change in ID number in the database when a new plugin is added or an existing one removed.
     */

    /*try {
        this.availablePlugins.forEach(function (plugin) {
            winston.debug(plugin.createPlugin().init())
        });
    } catch (e) {
        console.log(e)
    }
    */
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