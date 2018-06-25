import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')
import * as utils from '../../utilities'
import { MessageManager } from '../../message-manager/'
import * as volubleErrors from '../../voluble-errors'

/**
 * Handles the route GET /messages
 * Lists the first 100 messages available to the user, with a given offset.
 */
router.get('/', function (req, res, next) {
  console.log("got a req")
  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  console.log("Offset: " + offset)

  utils.verifyNumberIsInteger(offset)
    .then(function (off) {
      console.log("verified offset")
      return MessageManager.getHundredMessageIds(off)
    })
    .then(function (rows) {
      console.log("Got " + rows.length + " rows")
      res.status(200).json(rows)
    })
    .catch(function (error: any) {
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
      return MessageManager.getMessageFromId(id)
    })
    .then(function (msg) {
      res.status(200).json(msg)
    })
    .catch(function (error: any) {
      res.status(500).json(error.message)
      winston.error(error.message)
    })
})


/**
 * Handles the route POST /messages
 * Creates a new message, adds it to the database and attempts to send it.
 */
router.post('/', function (req, res, next) {
  winston.info("Creating new message")
  MessageManager.createMessage(
    req.body.msg_body,
    req.body.contact_id,// TODO: Validate me!
    req.body.direction || "INBOUND",
    req.body.is_reply_to || null,
    req.body.servicechain_id || null
  )
    .then(function (msg) {
      return MessageManager.sendMessage(msg)
    })
    .then(function (msg) {
      res.status(200).json(msg)
    })
    .catch(volubleErrors.MessageFailedError, function (err: any) {
      res.status(500).json(err)
      winston.error("Failed to send message: " + err)
    })
    .catch(function (err: any) {
      res.status(500).json(err)
      winston.error(err)
    })
})

module.exports = router;