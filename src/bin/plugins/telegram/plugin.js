var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')
const { MTProto } = require('telegram-mtproto')

var TelegramPlugin = function () {
    voluble_plugin_base.voluble_plugin.call(this)
    this.name = manifest.plugin_name
    this.description = manifest.plugin_description

    this.api_id = process.env.TELEGRAM_API_ID
    this.api_hash = process.env.TELEGRAM_API_HASH

    this.client = null
}

TelegramPlugin.prototype = Object.create(voluble_plugin_base.voluble_plugin.prototype)
TelegramPlugin.prototype.constructor = TelegramPlugin

/* Implement the functions required by `plugin_base`:
init, send_message, shutdown
*/

TelegramPlugin.prototype.init = function () {
    let server = { dev: true }
    let api = {}
    this.client = MTProto({ server, api })

    return (!!this.client)
}

TelegramPlugin.prototype.shutdown = function () {

}

TelegramPlugin.prototype.send_message = function (message, contact) {
    console.info(`Sending message with Telegram: ${message.body}`)

    let t = this
    this.checkPhoneNumExists(contact.phone_number)
        .then(function (phoneNumExists) {
            if (!phoneNumExists) {
                t.message_state_update(message, "MSG_FAILED")
            }
        })
        .catch(function (err) {
            t.message_state_update(message, "MSG_FAILED")
        })

}

TelegramPlugin.prototype.checkPhoneNumExists = function (phone_num) {

    return this.client('auth.checkPhone', {
        phone_number: phone_num
    })
        .then(function (checkedPhone) {
            console.log(`Phone number ${phone_num} registered: ${checkedPhone.phone_registered}`)

            return checkedPhone.phone_registered
        })
}


var createPlugin = function () {
    return new TelegramPlugin()
}

module.exports = createPlugin;
