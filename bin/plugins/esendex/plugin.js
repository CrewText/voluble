// @ts-check
var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')

var Q = require('Q')

var esendex = null

var EsendexPlugin = {
  name: manifest.plugin_name,
  description: manifest.plugin_description,

  username: manifest.esendex_username,
  password: manifest.esendex_password,
  account_ref: manifest.esendex_accountref
}

EsendexPlugin.init = function () {

  try {
    var esendex = require('esendex')({
      username: manifest.esendex_username,
      password: manifest.esendex_password
    })

    return true
  }

  catch (e) {
    console.log(e)
    return false
  }
}

EsendexPlugin.send_message = function (message) {
  let deferred = Q.defer()
  // This must be defined by *every* plugin. It will be called by the voluble when a message needs to be sent.
  console.log("Sending the message: " + message)
  return this.esendex_send_message(message.phone_number, message.message_text)
}

EsendexPlugin.shutdown = function(){
  return true
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

var createPlugin = function () {
  let es_plug = Object.assign(Object.create(voluble_plugin_base.voluble_plugin), EsendexPlugin)

  return es_plug
}

module.exports = { createPlugin };
