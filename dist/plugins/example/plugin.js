"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_base = require("../plugin_base");
var manifest = require('./manifest.json');
class MyExamplePlugin extends plugin_base.voluble_plugin {
    constructor() {
        super(manifest);
    }
    init() {
        return true;
    }
    send_message(message, contact) {
        console.log(`EXAMPLE: Sending message ${message.id} to contact ${contact.id}`);
        return false;
    }
    handle_incoming_message(message) {
        return { contact: "0", message_body: "" };
    }
}
var createPlugin = function () {
    return new MyExamplePlugin();
};
module.exports = createPlugin;
