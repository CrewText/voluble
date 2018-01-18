// @ts-check
var voluble_plugin_base = require('../plugin_base.js')
var manifest = require('./manifest.json')

var EsendexPlugin = function() {
  this.name= manifest.plugin_name
  this.description= manifest.plugin_description

  this.username= process.env.ESENDEX_USERNAME
  this.password= process.env.ESENDEX_PASSWORD
  this.account_ref= process.env.ESENDEX_ACCOUNT_REF

  this.esendex = null
}

EsendexPlugin.prototype = Object.create(voluble_plugin_base.voluble_plugin.prototype)
EsendexPlugin.prototype.constructor = EsendexPlugin

EsendexPlugin.prototype.init = function () {

  try {
    this.esendex = require('esendex')({
      username: this.username,
      password: this.password
    })
  }

  catch (e) {
    console.log(e)
  }

  finally{
    return !!this.esendex
  }
}

EsendexPlugin.prototype.send_message = function (message, contact) {

  // This must be defined by *every* plugin. It will be called by voluble when a message needs to be sent.

  let esendex_message = {
    accountreference: this.account_ref,
    message: [{
      to: contact.phone_number,
      body: message.body
    }]
  }

  this.esendex.messages.send(esendex_message, function (err, response) {
    if (err) {
      EsendexPlugin.prototype.message_state_update(message, "MSG_FAILED")
      console.log(err)
    } else {
      EsendexPlugin.prototype.message_state_update(message, "MSG_SENT")
    }
  })

  return true
}

EsendexPlugin.prototype.shutdown = function () {
  return true
}


var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
