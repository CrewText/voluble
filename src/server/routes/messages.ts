import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')
import * as utils from '../../utilities'
const errs = require('common-errors')
import { MessageManager } from '../../message-manager/'
import { ContactManager } from '../../contact-manager'
import { ServicechainManager } from '../../servicechain-manager'

/**
 * Handles the route GET /messages
 * Lists the first 100 messages available to the user, with a given offset.
 */
router.get('/', function (req, res, next) {
  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  utils.verifyNumberIsInteger(offset)
    .then(function (off) {
      return MessageManager.getHundredMessageIds(off)
    })
    .then(function (rows) {
      res.jsend.success(rows)
      //res.status(200).json(rows)
    })
    .catch(errs.TypeError, function (error) {
      res.jsend.fail({ 'id': "Supplied ID is not an integer" })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })

})

/**
 * Handles the route GET /messages/{id}
 * Lists all of the details about the contact with the specified ID.
 */
router.get('/:message_id', function (req, res, next) {

  return MessageManager.getMessageFromId(req.params.message_id)
    .then(function (msg) {
      if (msg) {
        res.jsend.success(msg)
      }
    })
    .catch(errs.TypeError, function (error) {
      res.jsend.fail({ 'id': "Supplied ID is not an integer" })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})


/**
 * Handles the route POST /messages
 * Creates a new message, adds it to the database and attempts to send it.
 */
router.post('/', function (req, res, next) {
  winston.info("Creating new message")

  ContactManager.checkContactWithIDExists(req.body.contact_id)
    .then(function (id) {

      // Verify the info we've been provided and fill in the gaps
      return Promise.try(function () {
        if (req.body.servicechain_id) {
          // Servicechain to use is explicitly supplied, using that
          return ServicechainManager.getServicechainById(req.body.servicechain_id)
        } else {
          // Using default servicechain for contact
          winston.debug(`MM: Finding default servicechain for contact ${id}`)
          return ServicechainManager.getServicechainFromContactId(id)
        }
      })
        .then(function (sc) {
          return MessageManager.createMessage(
            req.body.msg_body,
            req.body.id,
            req.body.direction || "OUTBOUND",
            sc.id || null,
            MessageManager.MessageStates.MSG_PENDING
          )
        })
    })
    .then(function (msg) {
      return MessageManager.sendMessage(msg)
    })
    .then(function (msg) {
      res.jsend.success(msg)
    })
    .catch(errs.NotFoundError, function (error) {
      res.jsend.fail(`Contact with ID ${req.body.contact_id} does not exist.`)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

module.exports = router;