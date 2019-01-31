import * as Promise from "bluebird";
import * as express from "express";
import { scopes } from "voluble-common";
import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager/';
import { ServicechainManager } from '../../servicechain-manager';
import * as utils from '../../utilities';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { checkUserOrganization } from '../security/scopes';
import { MessageStates } from 'voluble-common'
const router = express.Router();
const winston = require('winston')
const errs = require('common-errors')

/**
 * Handles the route GET /messages
 * Lists the first 100 messages available to the user, with a given offset.
 */
router.get('/', checkJwt,
  checkJwtErr,
  checkScopes([scopes.MessageRead, scopes.VolubleAdmin]),
  checkUserOrganization,
  function (req, res, next) {

    // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
    let offset = (req.query.offset == undefined ? 0 : req.query.offset)

    utils.verifyNumberIsInteger(offset)
      .then(function (off) {
        return MessageManager.getHundredMessageIds(off, req.user.organization)
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
router.get('/:message_id', checkJwt, checkJwtErr, checkScopes([scopes.MessageRead, scopes.VolubleAdmin]), function (req, res, next) {

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
router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.MessageSend, scopes.VolubleAdmin]), function (req, res, next) {
  winston.info("Creating new message")
  console.log(req.body)
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
            req.body.contact_id,
            req.body.direction || "OUTBOUND",
            sc.id || null,
            MessageStates.MSG_PENDING
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