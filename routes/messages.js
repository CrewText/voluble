const express = require('express');
const Q = require('Q')
const dbClient = require('mariasql');
const router = express.Router();
const winston = require('winston')
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')

function getHundredMessageIds(db, offset = 0) {
  let deferred = Q.defer()

  db.query("CALL GetOneHundredMessages(?)", offset, function (err, row) {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve(rows)
    }
  })


  return deferred.promise
}

router.get('/', function (req, res, next) {
  let client = new dbClient(req.app.locals.db_credentials);

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = req.query.offset == {} ? 0 : req.query.offset

  utils.verifyNumberIsInteger(offset)
    .then(function (rows) {
      res.status(200).json(rows)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })
    .finally(function () {
      client.end()
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
      //contact.servicechain, //?
      0,
      msg_is_reply_to)

    return message
  })

  Q.allSettled([msg_promise])
  .then(function(msg_proms){
    if (msg_proms[0].state === "rejected"){
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
      res.status(500).send(error.message)
      winston.error(error.message)
    })
    .done()

})

module.exports = router;