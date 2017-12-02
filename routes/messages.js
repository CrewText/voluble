const express = require('express');
const Q = require('Q')
const Promise = require('bluebird')
const router = express.Router();
const winston = require('winston')
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')

const db = require('../models')

router.get('/', function (req, res, next) {
  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  Promise.try(function () {
    return utils.verifyNumberIsInteger(offset)
  })
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

router.get('/:message_id', function (req, res, next) {

  Promise.try(function () {
    return utils.verifyNumberIsInteger(req.params.message_id)
  })
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

router.post('/', function (req, res, next) {
  
  messageManager.createMessage(
      req.body.msg_body,
      req.body.contact_id,// TODO: Validate me!
      req.body.direction)
  })
    .then(function (msg) {
      messageManager.sendMessage(msg)
      res.status(200).json(msg)
    })
    .catch(function (err) {
      res.status(500).json(err.message)
      winston.error(err.message)
    })
    .done()

module.exports = router;