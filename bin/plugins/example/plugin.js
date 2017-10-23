var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')


var ExamplePlugin = {
    name: manifest.plugin_name,
    description: manifest.plugin_description,

    api_key: manifest.data_fields.custom['api_key'],
    api_secret: manifest.data_fields.custom['api_secret'],

    /* Implement the functions required by `plugin_base`:
    init, send_message, shutdown
    */

    init: function(){
    },

    shutdown: function(){
    },
    
    send_message: function (message) {
    }
}

var createPlugin = function () {
    let ex_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), ExamplePlugin)

    return ex_plug
}

module.exports = {createPlugin};