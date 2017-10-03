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
    init, get_message_status, send_message, shutdown
    */

    init: function(){
        /* This is called by voluble when first initializing the message-sending plugin.
        Plugins should scrutinize provided parameters and make sure that is possible to safely
        init the plugin, then do so.
        If the plugin can be initialized, then `init` should return an instance of the plugin.
        If not, then return None. */
    },
    
    send_message: function (message) {
        // This is called by voluble when a plugin needs to be sent.
        console.log("Sending the message: " + message)
        return voluble_plugin_base.message_states.MESSAGE_SENT
    }
}

var createExamplePlugin = function (api_key, api_secret) {
    let ex_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), ExamplePlugin)

    ex_plug.api_key = api_key
    ex_plug.api_secret = api_secret

    return ex_plug
}

module.exports = {createExamplePlugin};
