import { Contact, Message, Org } from 'voluble-common'
import * as plugin_base from 'voluble-plugin-base'
// import * as rp from 'request-promise'
// import * as request from 'request'

class TelegramPlugin extends plugin_base.voluble_plugin {
    private TELEGRAM_SERVER_ADDR: string

    constructor() {
        super('Telegram', "Sends a Telegram Message")
        this.TELEGRAM_SERVER_ADDR = process.env.TELEGRAM_SERVER_ADDR
    }

    async handle_incoming_message(_message_data: unknown): Promise<plugin_base.InterpretedIncomingMessage> {
        throw new Error(`In plugin ${this.name} - the method 'handle_incoming_message' has not been implemented!`)
        return new Promise<plugin_base.InterpretedIncomingMessage>((resolve, _reject) => {
            resolve(<plugin_base.InterpretedIncomingMessage>{})
        })
    }

    async send_message(_message: Message, _contact: Contact, _org: Org): Promise<boolean> {
        //rp.post(this.TELEGRAM_SERVER_ADDR)
        throw new Error(`In plugin ${this.name} - the method 'send_message' has not been implemented!`)
        return new Promise<boolean>((resolve, _reject) => {
            resolve(true)
        })
    }
}

const createPlugin = function () {
    return new TelegramPlugin()
}
module.exports = createPlugin