import { MessageDirections, MessageStates } from 'voluble-common'
import * as winston from 'winston'
import { ContactManager } from '../contact-manager'
import * as db from '../models'
import { PluginManager } from '../plugin-manager'
import { QueueManager } from '../queue-manager'
import { ServicechainManager } from '../servicechain-manager'
const errs = require('common-errors')

let logger = winston.loggers.get('voluble-log').child({ module: 'MessageMgr' })

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
export namespace MessageManager {

    export class MessageStateInvalidError extends Error { }

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {string} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {string} direction If this is an outbound message, false. If it's inbound, true.
     * @param {string} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered into the database
     */
    export async function createMessage(body: string, contact_id: string, direction: "INBOUND" | "OUTBOUND", message_state: MessageStates,
        servicechain_id?: string, is_reply_to?: string): Promise<db.MessageInstance> {
        let msg_state = message_state ? message_state : MessageStates.MSG_PENDING

        let msg = db.models.Message.build({
            body: body,
            ServicechainId: servicechain_id,
            contact: contact_id,
            is_reply_to: is_reply_to,
            direction: direction == "INBOUND" ? MessageDirections.INBOUND : MessageDirections.OUTBOUND,
            message_state: msg_state
        })

        if (msg.body.includes("<title>") || msg.body.includes("<first_name>") || msg.body.includes("<surname>")) {
            let c = await ContactManager.getContactWithId(contact_id)
            msg.set('body', msg.body.replace("<title>", c.title))
            msg.set('body', msg.body.replace("<first_name>", c.first_name))
            msg.set('body', msg.body.replace("<surname>", c.surname))
        }
        // TODO: Add templating for User's name who sent Message

        return msg.save()
    }

    /**
     * Does what it says on the tin - attempts to send a message by finding the service in the messages' servicechain with priority 1.
     * @param {db.models.Sequelize.Message} msg A Message object representing the message to send.
     * @returns {db.models.Sequelize.message} The Sequelize message that has been sent.
     */
    export function sendMessage(msg: db.MessageInstance): db.MessageInstance {
        try {
            QueueManager.addMessageToSendRequest(msg)
        }
        catch {
            QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
        }

        return msg
    }

    export async function doMessageSend(msg: db.MessageInstance): Promise<db.MessageInstance> {
        // First, acquire the first service in the servicechain

        return ServicechainManager.getServiceCountInServicechain(msg.ServicechainId)
            .then(async function (svc_count) {
                let is_sent = false

                logger.debug(`MM: Beginning message send attempt loop for message ${msg.id}; ${svc_count} plugins in servicechain ${msg.ServicechainId}`)

                for (let current_svc_prio = 1; (current_svc_prio < svc_count + 1) && !is_sent; current_svc_prio++) {
                    logger.debug(`MM: Attempting to find plugin with priority ${current_svc_prio} in servicechain ${msg.ServicechainId}`)

                    is_sent = await ServicechainManager.getServiceInServicechainByPriority(msg.ServicechainId, current_svc_prio)
                        .then(function (svc) {
                            if (svc) {
                                logger.debug(`MM: Servicechain ${msg.ServicechainId} priority ${current_svc_prio}: ${svc.directory_name}. Attempting message ${msg.id} send...`)
                                return sendMessageWithService(msg, svc)
                            } else {
                                // return Promise.reject(`No service with priority ${svc_priority} in servicechain ${msg.ServicechainId}`)
                                return false
                            }
                        }).catch(ServicechainManager.EmptyServicechainError, function (error) {
                            errs.log(error, error.message)
                            is_sent = false
                            QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
                            return false
                        })
                        .catch(errs.NotFoundError, function (error) {
                            errs.log(error.message, error)
                            return false
                        })

                    if (!is_sent) {
                        // Wasn't able to send the message with this service, try the next one
                        logger.debug(`MM: Failed to send message ${msg.id}, trying next priority plugin...`)
                    }
                }

                if (is_sent) {
                    QueueManager.addMessageStateUpdateRequest(msg.id, MessageStates.MSG_DELIVERED_USER)
                    return Promise.resolve(msg)
                } else {
                    logger.info(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`)
                    QueueManager.addMessageStateUpdateRequest(msg.id, MessageStates.MSG_FAILED)
                    return Promise.reject(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`)
                }
            })
    }

    async function sendMessageWithService(msg: db.MessageInstance, svc: db.ServiceInstance): Promise<boolean> {
        return PluginManager.getPluginById(svc.id)
            .then(function (plugin) {
                if (plugin) {
                    logger.debug(`MM: Loaded plugin ${plugin.name}`)
                    return ContactManager.getContactWithId(msg.contact)
                        .then(async function (contact) {
                            if (contact) {
                                logger.debug(`MM: Found contact ${contact.id}, calling 'send_message() on plugin ${plugin.name} for message ${msg.id}...`)
                                try {
                                    return await plugin.send_message(msg, contact)
                                } catch (e) {
                                    if (e instanceof PluginManager.PluginImportFailedError) {
                                        errs.log(e.message, e)
                                        return Promise.reject(e)
                                    } else { throw e }
                                }
                            } else {
                                return Promise.reject(new errs.NotFoundError(`Could not find contact with ID ${msg.contact}`))
                            }
                        })
                } else {
                    return Promise.reject(new errs.NotFoundError(`Could not find plugin with ID ${svc.id}`))
                }
            })
    }

    export function updateMessageState(msg_id: string, msg_state: string): Promise<db.MessageInstance> {
        logger.info("MM: Updating message state", { 'message': msg_id, 'state': MessageStates[msg_state] })
        return getMessageFromId(msg_id)
            .then(function (msg) {
                if (msg) {
                    if (msg_state in MessageStates) {
                        msg.message_state = MessageStates[msg_state]
                    } else {
                        return Promise.reject(new MessageStateInvalidError(`Message with ID ${msg_id} supplied invalid MessageState: ${msg_state}`))
                    }
                    return msg.save()
                } else {
                    logger.warn(`MM: Could not find message with ID ${msg_id}`)
                    return Promise.reject(new errs.NotFoundError(`Message with ID ${msg_id} was not found`))
                }
            })
    }

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    export async function getHundredMessageIds(offset: number = 0, organization?: string): Promise<Array<db.MessageInstance>> {
        // Get all messages where the Contact is in the given Org.
        // If there isn't an Org, all messages where the contact's Org != null (which should be all of them)
        console.log("Getting messages for Org " + organization)
        return db.models.Message.findAll({
            offset: offset,
            limit: 100,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: db.models.Contact,
                    where: {
                        'OrganizationId': organization ? organization : { [db.sequelize.Op.ne]: null }
                    }
                }
            ]
        })
    }

    /**
     * Returns the details about a message with a given ID.
     * @param {Number} id The ID number of the message to retrieve.
     * @returns {promise} A Promise resolving to a row containing the details of the message.
     */
    export async function getMessageFromId(id: string): Promise<db.MessageInstance | null> {
        return db.models.Message.findByPk(id)
    }

    export async function getMessagesForContact(contact_id: string, offset: number = 0): Promise<db.MessageInstance[] | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (verified_contact_id) {
                return db.models.Message.findAll({
                    where: {
                        'contact': verified_contact_id
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 100,
                    offset: offset
                })
            })
    }
}