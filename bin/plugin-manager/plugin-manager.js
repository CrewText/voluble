const winston = require('winston')

var PluginManager = {
    plugin_dir: "",
    totalPluginsList: [],
    availablePlugins: [],
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
    this.availablePlugins.push(esendexPlugin)

    try {
        this.availablePlugins.forEach(function (plugin) {
            winston.debug(plugin.createPlugin().init())
        });
    } catch (e) {
        console.log(e)
    }
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