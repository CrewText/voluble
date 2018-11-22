"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_base_1 = require("../plugin_base");
var manifest = require('./manifest.json');
class TelegramPlugin extends plugin_base_1.voluble_plugin {
    constructor() {
        super(manifest);
        this.client = null;
        this.name = manifest.plugin_name;
        this.description = manifest.plugin_description;
        this.api_id = process.env.TELEGRAM_API_ID;
        this.api_hash = process.env.TELEGRAM_API_HASH;
    }
    shutdown() {
        return true;
    }
    send_message(message, contact) {
        let t = this;
        return this.checkPhoneNumExists(contact.phone_number)
            .then(function (phoneNumExists) {
            if (!phoneNumExists) {
                return false;
            }
            else {
                return true;
            }
        })
            .catch(function (err) {
            console.log(err);
            return false;
        });
    }
    checkPhoneNumExists(phone_num) {
        return this.client('auth.checkPhone', {
            phone_number: phone_num
        })
            .then(function (checkedPhone) {
            console.log(`Phone number ${phone_num} registered: ${checkedPhone.phone_registered}`);
            return checkedPhone.phone_registered;
        });
    }
}
var createPlugin = function () {
    return new TelegramPlugin();
};
module.exports = createPlugin;
