import * as plugin_base from '../plugin_base'
import * as http from 'http'
var manifest = require('./manifest.json')

class MyExamplePlugin extends plugin_base.voluble_plugin {
    api_key: string | undefined
    api_secret: string | undefined

    constructor() {
        super(manifest)
        // this.api_key = manifest.data_tables.custom['api_key']
        // this.api_secret = manifest.data_tables.custom['api_secret']
    }

    init(): boolean {
        return true
    }

    send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
        console.log(`EXAMPLE: Sending message ${message.id} to contact ${contact.id}`)
        return false
    }
    handle_incoming_message(message: any): plugin_base.InterpretedIncomingMessage {
        return <plugin_base.InterpretedIncomingMessage>{ contact: "0", message_body: "" }
    }
}

var createPlugin = function () {
    return new MyExamplePlugin()
}

module.exports = createPlugin;
