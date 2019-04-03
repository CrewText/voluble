import * as plugin_base from '../plugin_base'
import * as rp from 'request-promise'

class TelegramPlugin extends plugin_base.voluble_plugin {
    private TELEGRAM_SERVER_ADDR: string

    constructor() {
        super('Telegram', "Sends a Telegram Message")
        this.TELEGRAM_SERVER_ADDR = process.env.TELEGRAM_SERVER_ADDR
    }

    handle_incoming_message(message_data: any): plugin_base.InterpretedIncomingMessage {

    }

    send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance): boolean {
        rp.post(this.TELEGRAM_SERVER_ADDR)
    }
}

var createPlugin = function () {
    return new TelegramPlugin()
}