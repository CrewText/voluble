// @ts-check
var voluble_plugin_base = require('../plugin_base.js')

var ExamplePlugin = {
    name: "Example",
    description: "An example plugin for a service provider",

    api_key: "",
    api_secret: "",

    send_message: function (message) {
        // This must be defined by *every* function. It will be called by the voluble when a message needs to be sent.
        console.log("Sending the message: " + message)
        return true
    }
}

var createExamplePlugin = function (api_key, api_secret) {
    let ex_plug = Object.assign(Object.create(voluble_plugin_base), ExamplePlugin)

    ex_plug.api_key = api_key
    ex_plug.api_secret = api_secret

    return ex_plug
}

module.exports = {createExamplePlugin};
