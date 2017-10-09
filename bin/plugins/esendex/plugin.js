// @ts-check
var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')

var Q = require('Q')

var esendex = require('esendex')({
  username: manifest.esendex_username,
  password: manifest.esendex_password
}) // Add authentication info here

var EsendexPlugin = {
  name: manifest.plugin_name,
  description: manifest.plugin_description,

  username: manifest.esendex_username,
  password: manifest.esendex_password,
  account_ref: manifest.esendex_accountref
}

EsendexPlugin.send_message = function (message) {
  let deferred = Q.defer()
  // This must be defined by *every* plugin. It will be called by the voluble when a message needs to be sent.
  console.log("Sending the message: " + message)
  return this.esendex_send_message(message.phone_number, message.message_text)

}

EsendexPlugin.esendex_send_message = function (phone_number, message_text) {
  let deferred = Q.defer()
  let message = {
    accountreference: this.account_ref,
    message: [{
      to: phone_number,
      body: message_text
    }]
  }

  esendex.messages.send(message, function (err, response) {
    if (err) {
      console.log('Error sending message: ', err)
      console.log(response);
      deferred.reject(voluble_plugin_base.message.message_states.MESSAGE_FAILED)
    }
  })
}

var createEsendexPlugin = function (username, password, account_ref) {
  let es_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), EsendexPlugin)

  es_plug.username = username
  es_plug.password = password
  es_plug.account_ref = account_ref

  return es_plug
}

module.exports = { createEsendexPlugin };
