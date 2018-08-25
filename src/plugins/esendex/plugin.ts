import * as plugin_base from '../plugin_base'
var manifest = require('./manifest.json')
//const esendex = require('esendex')
//import * as Promise from 'bluebird'
import * as rp from 'request-promise'


class EsendexPlugin extends plugin_base.voluble_plugin {
  username: string | undefined
  password: string | undefined
  account_ref: string | undefined

  constructor() {
    super(manifest)
    this.username = process.env.ESENDEX_USERNAME
    this.password = process.env.ESENDEX_PASSWORD
    this.account_ref = process.env.ESENDEX_ACCOUNT_REF
  }

  send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
    let esendex_message = {
      accountreference: this.account_ref,
      messages: [{
        to: contact.phone_number,
        body: message.body
      }]
    }

    return rp.post("https://api.esendex.com/v1.0/messagedispatcher", {
      auth: {
        username: this.username || "",
        password: this.password || ""
      },
      json: true,
      body: esendex_message
    })
      .then(function (response: any) {
        return true
      })
      .catch(function (reason) {
        let error_msg
        switch (reason.name) {
          case "StatusCodeError":
            switch (reason.statusCode) {
              case 400:
                error_msg = "400 Bad Request: Invalid/Malformed request body or more than 50,000 messages in request."
                break
              case 401:
                error_msg = "401 Not Authorised: No authentication header provided."
                break
              case 402:
                error_msg = "402 Payment Required: Not enough message credits."
                break
              case 403:
                error_msg = "403 Forbidden: Failed authentication or not authorised to access feature."
                break
              case 404:
                error_msg = "404 Not Found: The specified contact or contact group doesn't exist."
                break
              case 406:
                error_msg = "406 Not Acceptable: Empty message body provided."
                break
              case 415:
                error_msg = "415 Unsupported Media Type: Content type is not supported or unspecified."
                break
              default:
                error_msg = "Unknown error"
                break
            }
            break

          case "RequestError":
            error_msg = reason.message
            break
          default:
            error_msg = "Unknown error"
            break
        }

        console.info(`ESENDEX: Got error while sending message ${message.id}: ${error_msg}`)
        return false
      })
  }

}

var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
