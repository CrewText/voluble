import * as plugin_base from '../plugin_base'
var manifest = require('./manifest.json')
const esendex = require('esendex')
import * as Promise from 'bluebird'

class EsendexPlugin extends plugin_base.voluble_plugin {
  username: string | undefined
  password: string | undefined
  account_ref: string | undefined
  client: any
  esendex_client_messages_send:Promise<{}>|undefined

  constructor() {
    super(manifest)
    this.username = process.env.ESENDEX_USERNAME
    this.password = process.env.ESENDEX_PASSWORD
    this.account_ref = process.env.ESENDEX_ACCOUNT_REF
  }



  createClient() {

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

  send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
    let esendex_message = {
      accountreference: this.account_ref,
      message: [{
        to: contact.phone_number,
        body: message.body
      }]
    }

    let status = false

    let esendex_client_messages_send = Promise.promisify(this.client.messages.send)

    return esendex_client_messages_send(esendex_message).then(function(response:any){
      return response
    })

    // this.client.messages.send(esendex_message, function (err: any, response: any) {
    //   if (err) {
    //     status = false
    //     console.log(err)
    //   } else {
    //     status = true
    //     return true
    //   }
    // })

    //return status

  }

}

var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
