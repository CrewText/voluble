var errors = require('common-errors')
var message = require('../messages/message')

var voluble_plugin = {
    name: null,
    description: null,
    plugin_uid: null,
}

voluble_plugin.init = function(){
    throw new errors.NotImplementedError("Plugin " + this.name + " has not defined the function 'init'. Contact the plugin author for a fix.")
}

voluble_plugin.shutdown = function(){
    throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'shutdown'. Contact the plugin author for a fix.")
}

voluble_plugin.get_message_status = function(message_id){
    throw new errors.NotImplementedError("Plugin " + this.name + "has not defined the function 'get_message_status'. Contact the plugin author for a fix.")
}

voluble_plugin.send_message = function (message_content, contact) {
    // This absolutely must be overridden by a plugin
    throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');

}

module.exports = {voluble_plugin};
