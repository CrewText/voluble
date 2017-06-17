// @ts-check
var errors = require('common-errors')

var voluble_plugin = {
    name: 'plugin_base_name',
    description: 'plugin_base_description',

    send_message: function (message_content, contact) {
        // This absolutely must be overridden by a plugin
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');

    }
}
module.exports = {voluble_plugin};
