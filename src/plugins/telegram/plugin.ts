import * as plugin_base from '../plugin_base'
import * as rp from 'request-promise'

class TelegramPlugin extends plugin_base.voluble_plugin {
    private TELEGRAM_SERVER_ADDR: string

    constructor() {
        super('Telegram', "Sends a Telegram Message")
        this.TELEGRAM_SERVER_ADDR = process.env.TELEGRAM_SERVER_ADDR
    }

    async handle_incoming_message(message_data: any) {
        throw new Error(`In plugin ${this.name} - the method 'handle_incoming_message' has not been implemented!`)
        return new Promise<plugin_base.InterpretedIncomingMessage>((resolve, reject) => {
            resolve(<plugin_base.InterpretedIncomingMessage>{})
        })
    }

    async send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
        //rp.post(this.TELEGRAM_SERVER_ADDR)
        throw new Error(`In plugin ${this.name} - the method 'send_message' has not been implemented!`)
        return new Promise<boolean>((resolve, reject) => {
            resolve(true)
        })
    }
}

var createPlugin = function () {
    return new TelegramPlugin()
}
module.exports = createPlugin