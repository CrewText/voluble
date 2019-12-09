import * as BBPromise from "bluebird";
import * as express from "express";
import { scopes } from "voluble-common";
import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager/';
import { ServicechainManager } from '../../servicechain-manager';
import { checkJwt, checkJwtErr, checkScopesMiddleware } from '../security/jwt';
import { setupUserOrganizationMiddleware, checkHasOrgAccess, ResourceOutOfUserScopeError } from '../security/scopes';
import { MessageStates } from 'voluble-common'
import validator from 'validator'
import { InvalidParameterValueError } from '../../voluble-errors'
const router = express.Router();
const winston = require('winston')

/**
 * Handles the route GET /messages
 * Lists the first 100 messages available to the user, with a given offset.
 */
/**
 * 
 * @api {get} /messages Get 100 messages after `offset`, sorted by `createdAt`
 * @apiName GetMessages
 * @apiGroup Messages
 
 * @apiSuccess (200) {json} data[] An Array of Messages that this User/Client has access to
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *     data: [
 *             {
 *                 [
 *                     id: aaaaaaaa-bbbb-cccc-dddddddddddd
 *                     message_idk
 *                 ]
 *             
 *             }
 *           ]
 * }
 * 
 * 
 */
router.get('/:org_id/messages/', checkJwt,
  checkJwtErr,
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  async function (req, res, next) {

    try {
      // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
      let offset = (req.query.offset == undefined ? 0 : req.query.offset)
      if (!validator.isInt(offset)) { throw new InvalidParameterValueError(`Supplied parameter value for 'offset' is not an integer`) }

      checkHasOrgAccess(req.user, req.params.org_id)

      let msg_ids = await MessageManager.getHundredMessageIds(offset, req.params.org_id)

      res.status(200).jsend.success(msg_ids)
    }

    catch (e) {
      if (e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail(e.message)
      } else if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).jsend.fail(e.message)
      } else {
        res.status(500).jsend.error(e.message)
      }
    }

  })

/**
 * Handles the route GET /messages/{id}
 * Lists all of the details about the contact with the specified ID.
 */
router.get('/:org_id/messages/:message_id', checkJwt,
  checkJwtErr, checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware, async function (req: any, res: any, _next) {

    try {
      checkHasOrgAccess(req.user, req.params.org_id)

      let msg = await MessageManager.getMessageFromId(req.params.message_id)
      if (msg) {
        res.status(200).jsend.success(msg)
      } else {
        res.status(404).jsend.fail(`Resource with ID ${req.params.message_id} not found`)
      }
    } catch (e) {
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).jsend.fail(e.message)
      } else {
        res.status(500).jsend.error(e.message)
      }
    }

  })


/**
 * Handles the route POST /messages
 * Creates a new message, adds it to the database and attempts to send it.
 */
router.post('/:org_id/messages/', checkJwt, checkJwtErr,
  checkScopesMiddleware([scopes.MessageSend, scopes.VolubleAdmin]), setupUserOrganizationMiddleware,
  async function (req, res, next) {
    try {
      if (!req.body.contact) {
        throw new InvalidParameterValueError(`Invalid value for parameter 'contact': ${req.body.contact}`)
      }
      if (!req.body.body) {
        throw new InvalidParameterValueError(`Invalid value for parameter 'body': ${req.body.body}`)
      }
      checkHasOrgAccess(req.user, req.params.org_id)

      let contact = await ContactManager.getContactWithId(req.body.contact)
      let sc = req.body.ServicechainId ? await ServicechainManager.getServicechainById(req.body.ServicechainId) : await contact.getServicechain()

      let msg = await MessageManager.createMessage(req.body.body,
        req.body.contact,
        req.body.direction || "OUTBOUND", //TODO: <-- Is this necessary? If the message is being sent, then it's outbound implicitly...
        MessageStates.MSG_PENDING,
        sc.id || null,
        req.body.is_reply_to || null)

      msg = MessageManager.sendMessage(msg)

      res.status(200).jsend.success(msg)

    } catch (e) {
      if (e instanceof ResourceOutOfUserScopeError) {
        winston.warn(e)
        res.status(403).jsend.fail(e.message)
      } else if (e instanceof InvalidParameterValueError) {
        winston.warn(e)
        res.status(400).jsend.fail(e.message)
      } else {
        winston.error(e)
        res.status(500).jsend.error(`An internal error has occurred: ${e.name}`)
      }
    }
  })

module.exports = router;