// @ts-check
var voluble_plugin_base = require('../plugin_base.js')
var esendex = require('esendex') // Add authentication info here

var EsendexPlugin = {
    name: "Esendex",
    description: "A plugin allowing Esendex to be used a an SMS Service Provider",

    username: null,
    password: null,
    account_ref: null,

    send_message: function (message) {
        // This must be defined by *every* function. It will be called by the voluble when a message needs to be sent.
        console.log("Sending the message: " + message).
        esendex_send_message(message.phone_number, message.message_text)
        return voluble_plugin_base.message_states.MESSAGE_SENT
    }

    esendex_send_message: function(phone_number, message_text){
      let message = {
        accountreference: this.account_ref,
        message:[{
          to: phone_number,
          body: message_text
        }]
      }

      esendex.messages.send(message, function (err, response){
        if (err){
          console.log('Error sending message: ', err)
          console.log(response);
          return voluble_plugin_base.message_states.MESSAGE_FAILED
        }
      })
    }
}

var createEsendexPlugin = function (username, password, account_ref) {
    let es_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), EsendexPlugin)

    es_plug.username = username
    es_plug.password = password
    es_plug.account_ref = account_ref

    return es_plug
}

module.exports = {createEsendexPlugin};
