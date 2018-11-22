"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors = require('common-errors');
const events_1 = require("events");
class voluble_plugin {
    constructor(manifest) {
        this._eventEmitter = new events_1.EventEmitter();
        this._plugin_dir = __dirname;
        if (manifest.hasOwnProperty("plugin_name")) {
            this.name = manifest["plugin_name"];
        }
        else {
            throw new errors.NotImplementedError(`Plugin in the following directory has not defined the field 'plugin_name' in it's manifest: ${__dirname}`);
        }
        if (manifest.hasOwnProperty("plugin_description")) {
            this.description = manifest["plugin_description"];
        }
        else {
            throw new errors.NotImplementedError(`Plugin ${this.name} has not defined the field 'plugin_description' in it's manifest.`);
        }
    }
    get PLUGIN_HOME() {
        return this._plugin_dir;
    }
    send_message(message, contact) {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined a message-sending method. Contact the plugin author for a fix.');
    }
    handle_incoming_message(message_data) {
        throw new errors.NotImplementedError('Plugin ' + this.name + ' has not defined the `handle_incoming_message` method. Contact the plugin author for a fix.');
    }
}
exports.voluble_plugin = voluble_plugin;
