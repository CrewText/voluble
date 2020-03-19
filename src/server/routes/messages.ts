import * as express from "express";
import validator from 'validator';
import { MessageStates, scopes } from "voluble-common";
import * as winston from 'winston';
import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager/';
import { ServicechainManager } from '../../servicechain-manager';
import { InvalidParameterValueError } from '../../voluble-errors';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, ResourceOutOfUserScopeError, setupUserOrganizationMiddleware } from '../security/scopes';
import { checkLimit, checkOffset } from "../helpers/check_limit_offset";
import { Message } from "../../models/message";
import { checkExtendsModel } from "../helpers/check_extends_model";

const router = express.Router();
let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'MessagesRoute' })
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

  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkLimit(0, 100),
  checkOffset(0),
  async function (req, res, next) {

    try {

      checkHasOrgAccess(req['user'], req.params.org_id)

      let msg_ids = await MessageManager.getMessages(req.query.offset, req.query.limit, req.params.org_id)

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
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware, async function (req: any, res: any, _next) {

    try {
      checkHasOrgAccess(req['user'], req.params.org_id)

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
router.post('/:org_id/messages/', checkJwt,
  checkScopesMiddleware([scopes.MessageSend, scopes.VolubleAdmin]), setupUserOrganizationMiddleware,
  async function (req, res, next) {
    try {
      checkExtendsModel(req.body, Message)
      //   if (!req.body.contact) {
      //     throw new InvalidParameterValueError(`Invalid value for parameter 'contact': ${req.body.contact}`)
      //   }
      //   if (!req.body.body) {
      //     throw new InvalidParameterValueError(`Invalid value for parameter 'body': ${req.body.body}`)
      //   }
      checkHasOrgAccess(req['user'], req.params.org_id)

      let contact = await ContactManager.getContactWithId(req.body.contact)
      let sc = req.body.ServicechainId ? await ServicechainManager.getServicechainById(req.body.ServicechainId) : await contact.getServicechain()

      let msg = await MessageManager.createMessage(req.body.body,
        req.body.contact,
        req.body.direction || "OUTBOUND", //TODO: <-- Is this necessary? If the message is being sent, then it's outbound implicitly...
        MessageStates.MSG_PENDING,
        sc.id || null,
        req.body.is_reply_to || null,
        req['user'].sub || null)

      msg = MessageManager.sendMessage(msg)

      res.status(200).jsend.success(msg)

    } catch (e) {
      if (e instanceof ResourceOutOfUserScopeError) {
        logger.warn(e)
        res.status(403).jsend.fail(e.message)
      } else if (e instanceof InvalidParameterValueError) {
        logger.warn(e)
        res.status(400).jsend.fail(e.message)
      } else {
        logger.error(e)
        res.status(500).jsend.error(`An internal error has occurred: ${e.name}`)
      }
    }
  })

module.exports = router;