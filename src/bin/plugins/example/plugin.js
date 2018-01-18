var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')


var ExamplePlugin = function () {
    this.name = manifest.plugin_name
    this.description = manifest.plugin_description

    this.api_key = manifest.data_fields.custom['api_key']
    this.api_secret = manifest.data_fields.custom['api_secret']
}

ExamplePlugin.prototype = Object.create(voluble_plugin_base.voluble_plugin.prototype)
ExamplePlugin.prototype.constructor = ExamplePlugin

/*
Implement the functions required by `plugin_base`:
init, send_message, shutdown
*/

ExamplePlugin.prototype.init = function () {
}

ExamplePlugin.prototype.shutdown = function () {
}

ExamplePlugin.prototype.send_message = function (message) {
}

var createPlugin = function () {
    return new ExamplePlugin()
}

module.exports = createPlugin;
