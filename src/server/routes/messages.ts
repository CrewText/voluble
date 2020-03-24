import * as express from "express";
import validator from 'validator';
import { MessageStates, scopes } from "voluble-common";
import * as winston from 'winston';
import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager/';
import { ServicechainManager } from '../../servicechain-manager';
import { InvalidParameterValueError, ResourceOutOfUserScopeError, ResourceNotFoundError } from '../../voluble-errors';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, setupUserOrganizationMiddleware } from '../security/scopes';
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
      let messages = await MessageManager.getMessages(req.query.offset, req.query.limit, req.params.org_id)
      let serialized = req.app.locals.serializer('message', messages)
      res.status(200).json(serialized)
    }
    catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
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
        res.status(200).json(await req.app.locals.serializer.serializeAsync('message', msg))
      } else {
        throw new ResourceNotFoundError(`Resource with ID ${req.params.message_id} not found`)
      }
    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof ResourceNotFoundError) {
        res.status(404).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
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

      let serialized = await req.app.locals.serializer.serializeAsync('message', msg)
      res.status(200).json(serialized)

    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
        logger.warn(e)
      } else {
        res.status(500).json(serialized_err)
        logger.error(e)
      }
    }
  })

module.exports = router;