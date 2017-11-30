const express = require('express');
const Q = require('Q')
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

  /*sequelization*/

  winston.info(req.body)

  let msg_promise = Q.fcall(function () {
    let msg_body = req.body.msg_body
    let msg_contact_id = req.body.contact_id // TODO: Validate me!
    let msg_direction = req.body.direction
    let msg_is_reply_to = req.body.is_reply_to

    let msg = db.sequelize.model('Message').create({
      body: msg_body,
      servicechain: 1,//TODO: Make this the ID of a real servicechain
      contact: msg_contact_id, // TODO: Validate this
      is_reply_to: msg_is_reply_to,
      direction: true,
      message_state: 'MSG_PENDING'
    })

    return msg
  })

  Q.allSettled([msg_promise])
    .then(function (msg_proms) {
      if (msg_proms[0].state === "rejected") {
        throw new Error(msg_proms[0].reason)
      }
      return msg_proms[0].value
    })
    .then(function (msg) {
      messageManager.sendMessage(msg)
      res.status(200).json(msg)
    })
    .catch(function (err) {
      res.status(500).json(err.message)
      winston.error(error.message)
    })
    .done()
})

module.exports = router;