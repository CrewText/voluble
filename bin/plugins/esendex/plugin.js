// @ts-check
var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')

var esendex = null

var EsendexPlugin = {
  name: manifest.plugin_name,
  description: manifest.plugin_description,

  username: process.env.ESENDEX_USERNAME,
  password: process.env.ESENDEX_PASSWORD,
  account_ref: process.env.ESENDEX_ACCOUNT_REF,

  init: function () {

    try {
      esendex = require('esendex')({
        username: this.username,
        password: this.password
      })

      return true
    }

    catch (e) {
      console.log(e)
      return false
    }
  },

  send_message: function (message, contact) {

      // This must be defined by *every* plugin. It will be called by voluble when a message needs to be sent.
      console.log("Esendex: Sending the message: " + message.body)

      let esendex_message = {
        accountreference: this.account_ref,
        message: [{
          to: contact.phone_number,
          body: message.body
        }]
      }

      esendex.messages.send(esendex_message, function (err, response) {
        if (err) {
          voluble_plugin_base.voluble_plugin.message_state_update(message, "MSG_FAILED")
          console.log(err)
        } else {
          voluble_plugin_base.voluble_plugin.message_state_update(message, "MSG_SENT")
        }
      })

      return true
  },

  shutdown: function () {
    return true
  }
}

var createPlugin = function () {
  let es_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), EsendexPlugin)

  return es_plug
}

module.exports = createPlugin;
