import * as plugin_base from '../plugin_base'
import * as rp from 'request-promise'

class TelegramPlugin extends plugin_base.voluble_plugin {
    private TELEGRAM_SERVER_ADDR: string

    constructor() {
        super('Telegram', "Sends a Telegram Message")
        this.TELEGRAM_SERVER_ADDR = process.env.TELEGRAM_SERVER_ADDR
    }

    handle_incoming_message(message_data: any): plugin_base.InterpretedIncomingMessage {
        throw new Error(`In plugin ${this.name} - the method 'handle_incoming_message' has not been implemented!`)
    }

    send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance): boolean {
        //rp.post(this.TELEGRAM_SERVER_ADDR)
        throw new Error(`In plugin ${this.name} - the method 'send_message' has not been implemented!`)
    }
}

var createPlugin = function () {
    return new TelegramPlugin()
}
module.exports = createPlugin