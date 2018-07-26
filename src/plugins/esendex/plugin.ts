import { voluble_plugin, contactInstance, messageInstance } from '../plugin_base'
var manifest = require('./manifest.json')
const esendex = require('esendex')

class EsendexPlugin extends voluble_plugin {
  username: string | undefined
  password: string | undefined
  account_ref: string | undefined
  client: any

  constructor() {
    super()
    this.name = manifest.plugin_name
    this.description = manifest.plugin_description
    this.username = process.env.ESENDEX_USERNAME
    this.password = process.env.ESENDEX_PASSWORD
    this.account_ref = process.env.ESENDEX_ACCOUNT_REF
  }

  createPluginDataTables(): boolean {

    try {
      this.client = esendex({
        username: this.username,
        password: this.password
      })
    }

    catch (e) {
      console.log(e)
    }

    finally {
      return !!this.client
    }
  }

  shutdown(): boolean {
    return true
  }

  send_message(message: messageInstance, contact: contactInstance) {
    let esendex_message = {
      accountreference: this.account_ref,
      message: [{
        to: contact.phone_number,
        body: message.body
      }]
    }

    let t = this

    return this.client.messages.send(esendex_message, function (err: any, response: any) {
      if (err) {
        t.message_state_update(message, "MSG_FAILED")
        return false
        console.log(err)
      } else {
        t.message_state_update(message, "MSG_SENT")
        return true
      }
    })
  }

}

var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
