var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')

var ExamplePlugin = {
    name: manifest.plugin_name,
    description: manifest.plugin_description,

    /* This bit isn't right - the plugin will actually need to query the DB
    with the table name '`manifest.plugin_uid`_data'
    */
    api_key: manifest.data_fields.custom['api_key'],
    api_secret: manifest.data_fields.custom['api_key'],

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
