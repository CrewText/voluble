import * as express from "express";
import { MessageDirections, MessageStates, scopes } from "voluble-common";
import * as winston from 'winston';

import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager/';
import { Message } from "../../models/message";
import { ServicechainManager } from '../../servicechain-manager';
import { InvalidParameterValueError, ResourceNotFoundError, ResourceOutOfUserScopeError } from '../../voluble-errors';
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkHasCredits } from "../helpers/check_has_credits";
import { checkLimit, checkOffset } from "../helpers/check_limit_offset";
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccess, checkScopesMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';
const router = express.Router();
const logger = winston.loggers.get(process.mainModule.filename).child({ module: 'MessagesRoute' })
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
      let from_date: Date, to_date: Date, direction: MessageDirections, state: MessageStates, contact: string, user: string
      if (req.query.from_date) {
        if ((typeof req.query.from_date == "number" && req.query.from_date > -1) || typeof req.query.from_date == "string" && !isNaN(parseInt(req.query.from_date, 10))) {
          from_date = new Date((typeof req.query.from_date == "number" ? req.query.from_date : parseInt(req.query.from_date, 10)) * 1000);
        }
        else { throw new InvalidParameterValueError(`from_date must be a positive number representing a Unix timestamp in seconds: ${req.query.from_date}`) }
      }
      if (req.query.to_date) {
        if ((typeof req.query.to_date == "number" && req.query.to_date > -1) || typeof req.query.to_date == "string" && isNaN(parseInt(req.query.to_date, 10))) {
          to_date = new Date((typeof req.query.to_date == "number" ? req.query.to_date : parseInt(req.query.to_date, 10)) * 1000);
        }
        else { throw new InvalidParameterValueError(`to_date must be a positive number representing a Unix timestamp in seconds: ${req.query.to_date}`) }
      }
      if (req.query.direction) {
        if (req.query.direction in MessageDirections) { direction = req.query.direction as MessageDirections }
        else { throw new InvalidParameterValueError(`direction must be one of the following: ${Object.values(MessageDirections)}`) }
      }
      if (req.query.state) {
        if (req.query.state in MessageStates) { state = req.query.state as MessageStates }
        else { throw new InvalidParameterValueError(`state must be one of the following: ${Object.values(MessageStates)}`) }
      }
      if (req.query.contact) {
        if (typeof req.query.contact == "string") { contact = req.query.contact }
      }
      if (req.query.user) {
        if (typeof req.query.user == "string") { contact = req.query.user }
      }

      const messages = await MessageManager.getMessages(parseInt(req.query.offset as string), parseInt(req.query.limit as string), req.params.org_id, from_date, to_date, contact, direction, state, user)
      const serialized = req.app.locals.serializer.serialize('message', messages)
      return res.status(200).json(serialized)
    }
    catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
      }
    }
  })

router.get('/:org_id/messages/count', checkJwt,
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  setupUserOrganizationMiddleware,
  (req, res, next) => {
    new Promise((res, rej) => {
      res(checkHasOrgAccess(req['user'], req.params.org_id))
    })
      .then(() => {
        return MessageManager.getMessages(0, 100000, req.params.org_id,
          req.query.start_timestamp ? new Date(parseInt(req.query.start_timestamp as string) * 1000) : new Date(0),
          req.query.end_timestamp ? new Date(parseInt(req.query.end_timestamp as string) * 1000) : new Date())
      })
      .then(msgs => {
        res.status(200).json({ data: { count: msgs.length } })
      })
      .catch(e => {
        const serialized_err = res.app.locals.serializer.serializeError(e)
        if (e instanceof ResourceOutOfUserScopeError) {
          res.status(403).json(serialized_err)
        }
        else if (e instanceof ResourceNotFoundError) {
          res.status(400).json(serialized_err)
        }
        else {
          logger.error(e.message)
          res.status(500).json(serialized_err)
        }
      })
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

      const msg = await MessageManager.getMessageFromId(req.params.message_id)
      if (msg) {
        res.status(200).json(await req.app.locals.serializer.serializeAsync('message', msg))
      } else {
        throw new ResourceNotFoundError(`Resource with ID ${req.params.message_id} not found`)
      }
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
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
 * Returns the message specified and any replies, then checks for all further replies, so as to create
 * a full thread.
 */
router.get('/:org_id/messages/:message_id/replies', checkJwt,
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware, async function (req: any, res: any, _next) {

    try { checkHasOrgAccess(req['user'], req.params.org_id) }
    catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      res.status(403).json(serialized_err)
    }

    MessageManager.getRepliesToMessage(req.params.message_id)
      .then(msgs => {
        res.status(200).json(req.app.locals.serializer.serialize('message', msgs))
      })
      .catch(e => {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof ResourceNotFoundError) {
          res.status(404).json(serialized_err)
        } else {
          res.status(500).json(serialized_err)
        }
      })
  })

/**
 * Handles the route POST /messages
 * Creates a new message, adds it to the database and attempts to send it.
 */
router.post('/:org_id/messages/', checkJwt,
  checkScopesMiddleware([scopes.MessageSend, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkHasCredits(1),
  async function (req, res, next) {
    try {
      checkExtendsModel(req.body, Message)
      checkHasOrgAccess(req['user'], req.params.org_id)

      const contact = await ContactManager.getContactWithId(req.body.contact)
      if (!contact) { throw new ResourceNotFoundError(`Contact with ID ${req.body.contact} not found`) }
      const sc = req.body.servicechain ? await ServicechainManager.getServicechainById(req.body.servicechain) : await contact.getServicechain()

      let msg = await MessageManager.createMessage(req.body.body,
        req.body.contact,
        req.body.direction || "OUTBOUND", //TODO: <-- Is this necessary? If the message is being sent, then it's outbound implicitly...
        MessageStates.MSG_PENDING,
        req.params.org_id,
        sc.id || null,
        req.body.is_reply_to || null,
        req['user'].sub || null,
        1)

      msg = MessageManager.sendMessage(msg)

      const serialized = await req.app.locals.serializer.serializeAsync('message', msg)
      res.status(200).json(serialized)

    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
        logger.error(e)
      }
    }
  })

export default router;