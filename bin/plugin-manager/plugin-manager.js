const winston = require('winston')

var PluginManager = {
    plugin_dir: "",
    totalPluginsList: [],
    availablePlugins: [],
}

PluginManager.initAllPlugins = function (plugin_dir) {
    winston.debug("Attempting to load plugins")
    this.plugin_dir = plugin_dir
    this.loadAllPlugins()
}

PluginManager.loadAllPlugins = function () {
    // Cycle through plugin directory and try to init all available plugins
    // TODO: make loadAllPlugins actually work, and loop through stuff! #1
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

PluginManager.shutdownAllPlugins = function () {
    try{
        this.availablePlugins.forEach(function(plugin){
            plugin.shutdown()
        })
    } catch (e) {
        console.log(e)
    }
}

module.exports = PluginManager