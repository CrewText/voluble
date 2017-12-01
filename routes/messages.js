const express = require('express');
const Q = require('Q')
const bluebird = require('bluebird')
const router = express.Router();
const winston = require('winston')
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')

const db = require('../models')

router.get('/', function (req, res, next) {
  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  utils.verifyNumberIsInteger(offset)
    .then(function (offset) {
      return db.sequelize.model('Message').findAll({
        offset: offset,
        limit: 100
      })
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
router.get('/:message_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.message_id)
    .then(function (id) {
      return db.sequelize.model('Message').findOne({
        where: { id: id }
      })
    })
    .then(function (msg) {
      res.status(200).json(msg)
    })
    .catch(function (error) {
      res.status(500).json(error.message)
      winston.error(error.message)
    })
    .done()
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function (req, res, next) {

  console.log(req.body.direction)
  Q.fcall(function(){
  return messageManager.createMessage(
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
})

module.exports = router;