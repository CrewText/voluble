const express = require('express');
const Q = require('Q')
const router = express.Router();
const winston = require('winston')
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')

router.get('/', function (req, res, next) {
  

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  utils.verifyNumberIsInteger(offset)
    .then(function (offset) {
      return messageManager.getHundredMessageIds(offset)
    })
    .then(function (rows) {
      res.status(200).json(rows)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })
    .done()
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function (req, res, next) {
  res.render('message_info', { contact_id: id })
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function (req, res, next) {

  // Get message details from request body
  let msg_promise = Q.fcall(function () {
    msg_body = req.body.msg_body
    msg_contact_id = req.body.contact_id
    msg_direction = req.body.direction
    msg_is_reply_to = req.body.is_reply_to

    // Create the message
    let message = messageManager.createNewMessage(msg_body,
      msg_contact_id,
      msg_direction,
      //contact.servicechain, //TODO: Make this the ID of a real servicechain
      1,
      msg_is_reply_to)

    return message
  })

  Q.allSettled([msg_promise])
    .then(function (msg_proms) {
      if (msg_proms[0].state === "rejected") {
        throw new Error(msg_proms[0].reason)
      }
      return msg_proms[0].value
    })
    .then(function (message) {
      // Send the message!
      messageManager.sendMessage(message)
      res.status(200).json(message)
    })
    .catch(function (error) {
      res.status(500).json(error.message)
      winston.error(error.message)
    })
    .done()

})

module.exports = router;