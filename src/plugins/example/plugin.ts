import { Contact, Message, Org } from 'voluble-common'
import * as plugin_base from 'voluble-plugin-base'

class MyExamplePlugin extends plugin_base.voluble_plugin {
    api_key: string | undefined
    api_secret: string | undefined

    constructor() {
        super("My Example plugin", "Does wonderful, examplar things")
        // this.api_key = manifest.data_tables.custom['api_key']
        // this.api_secret = manifest.data_tables.custom['api_secret']
    }

    init(): boolean {
        return true
    }

    async send_message(message: Message, contact: Contact, _org: Org) {
        this.logger.info(`EXAMPLE: Sending message ${message.id} to contact ${contact.id}`)
        return new Promise<boolean>((resolve, _reject) => {
            resolve(false)
        })
    }

    handle_incoming_message(_message: Record<string, unknown> | string) {
        return new Promise<plugin_base.InterpretedIncomingMessage>((resolve, _reject) => {
            resolve(<plugin_base.InterpretedIncomingMessage>{ contact: "0", message_body: "" })
        })
    }
}

const createPlugin = function () {
    return new MyExamplePlugin()
}

module.exports = createPlugin;
