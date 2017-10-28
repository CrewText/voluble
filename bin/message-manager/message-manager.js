const winston = require('winston')
const messages = require('../messages/message')

var MessageManager = {

}

MessageManager.createEmptyMessage = function () {
    /* TODO: Should createNewMessage return a ready-to-go message with a new DB message ID?
     Should it register in the DB? */
    let m = Object.create(messages.Message)
    return m
  }

module.exports = MessageManager