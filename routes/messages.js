const express = require('express');
const Promise = require('bluebird')
const router = express.Router();
const winston = require('winston')
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')
const db = require('../models')

/**
 * Handles the route GET /messages
 * Lists the first 100 messages available to the user, with a given offset.
 */
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

})

/**
 * Handles the route GET /messages/{id}
 * Lists all of the details about the contact with the specified ID.
 */
router.get('/:message_id', function (req, res, next) {

  return utils.verifyNumberIsInteger(req.params.message_id)
    .then(function (id) {
      return messageManager.getMessageFromId(id)
    })
    .then(function (msg) {
      res.status(200).json(msg)
    })
    .catch(function (error) {
      res.status(500).json(error.message)
      winston.error(error.message)
    })
})


/**
 * Handles the route POST /messages
 * Creates a new message, adds it to the database and attempts to send it.
 */
router.post('/', function (req, res, next) {

  messageManager.createMessage(
    req.body.msg_body,
    req.body.contact_id,// TODO: Validate me!
    req.body.direction
  )
    .then(function (msg) {
      messageManager.sendMessage(msg)
    })
    .then(function (msg){
      res.status(200).json(msg)
    })
    .catch(function (err) {
      res.status(500).json(err.message)
      winston.error(err.message)
    })
})

module.exports = router;