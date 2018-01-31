import { voluble_plugin, contactInstance, messageInstance } from '../plugin_base'
var manifest = require('./manifest.json')
import MTProto from 'telegram-mtproto'

class TelegramPlugin extends voluble_plugin {
    api_id: string | undefined
    api_hash: string | undefined
    client: any = null


    constructor() {
        super()
        this.name = manifest.plugin_name
        this.description = manifest.plugin_description
        this.api_id = process.env.TELEGRAM_API_ID
        this.api_hash = process.env.TELEGRAM_API_HASH
    }

    init():boolean{
        let server = { dev: true }
        let api = {}
        this.client = MTProto({ server, api })

        return (!!this.client)
    }

    shutdown():boolean{
        return true
    }

    send_message(message: messageInstance, contact:contactInstance){
        let t = this
        this.checkPhoneNumExists(contact.phone_number)
        .then(function(phoneNumExists){
            if (!phoneNumExists){
                t.message_state_update(message, "MSG_FAILED")
            }
        })
        .catch(function(err){
            console.log(err)
            t.message_state_update(message, "MSG_FAILED")
        })
    }

    checkPhoneNumExists(phone_num: string): Promise<boolean>{
        return this.client('auth.checkPhone', {
            phone_number: phone_num
        })
            .then(function (checkedPhone:any) {
                console.log(`Phone number ${phone_num} registered: ${checkedPhone.phone_registered}`)
    
                return checkedPhone.phone_registered
            })
    }
}

var createPlugin = function () {
    return new TelegramPlugin()
}

module.exports = createPlugin;
