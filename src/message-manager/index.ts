const winston = require('winston')
import * as Promise from "bluebird"
import * as db from '../models'
import * as volubleErrors from '../voluble-errors'
import { ServicechainManager } from '../servicechain-manager'
import { PluginManager } from '../plugin-manager'
import { ContactManager } from '../contact-manager'
import { QueueManager } from '../queue-manager'
const errs = require('common-errors')

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
export namespace MessageManager {

    export enum MessageStates {
        MSG_PENDING = "MSG_PENDING",
        MSG_SENDING = "MSG_SENDING",
        MSG_SENT = "MSG_SENT",
        MSG_DELIVERED_SERVICE = "MSG_DELIVERED_SERVICE",
        MSG_DELIVERED_USER = "MSG_DELIVERED_USER",
        MSG_READ = "MSG_READ",
        MSG_REPLIED = "MSG_REPLIED",
        MSG_FAILED = "MSG_FAILED",
        MSG_ARRIVED = "MSG_ARRIVED"
    }

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {string} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {string} direction If this is an outbound message, false. If it's inbound, true.
     * @param {string} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered into the database
     */
    export function createMessage(body: string, contact_id: string, direction: "INBOUND" | "OUTBOUND",
        servicechain_id: string, message_state: MessageStates, is_reply_to?: string): Promise<db.MessageInstance> {
        let msg_state = message_state ? message_state : MessageStates.MSG_PENDING

        let msg = db.models.Message.build({
            body: body,
            ServicechainId: servicechain_id,
            contact: contact_id,
            is_reply_to: is_reply_to,
            direction: direction,
            message_state: msg_state
        })
        return msg.save()
    }

    /**
     * Does what it says on the tin - attempts to send a message by finding the service in the messages' servicechain with priority 1.
     * @param {db.models.Sequelize.Message} msg A Message object representing the message to send.
     * @returns {promise} Promise resolving to the Sequelize message that has been sent.
     */
    export function sendMessage(msg: db.MessageInstance): db.MessageInstance {
        Promise.try(function () {
            return QueueManager.addMessageToSendRequest(msg)
        })
            .catch(function () {
                return QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
            })

        return msg
    }

    export function doMessageSend(msg: db.MessageInstance): Promise<db.MessageInstance> {
        // First, acquire the first service in the servicechain

        return ServicechainManager.getServiceCountInServicechain(msg.ServicechainId).then(function (svc_count) {

            let continue_trying = true
            //let svc_priority = 1

            winston.debug(`MM: Beginning message send attempt loop for message ${msg.id}; ${svc_count} plugins in servicechain ${msg.ServicechainId}`)

            let svc_prorities: number[] = []
            let i = 1
            while (i != svc_count + 1) {
                svc_prorities.push(i)
                i++
            }

            return Promise.mapSeries(svc_prorities, function (svc_priority) {
                if (continue_trying) {

                    winston.debug(`MM: Attempting to find plugin with priority ${svc_priority} in servicechain ${msg.ServicechainId}`)

                    return ServicechainManager.getServiceInServicechainByPriority(msg.ServicechainId, svc_priority)
                        .then(function (svc) {
                            if (svc) {
                                winston.debug(`MM: Servicechain ${msg.ServicechainId} priority ${svc_priority}: ${svc.directory_name}. Attempting message ${msg.id} send...`)
                                return sendMessageWithService(msg, svc)
                            } else {
                                // return Promise.reject(`No service with priority ${svc_priority} in servicechain ${msg.ServicechainId}`)
                                return false
                            }
                        })
                        .then(function (message_sent) {
                            if (message_sent) {
                                continue_trying = false
                                return true
                            } else {
                                // Wasn't able to send the message with this service, try the next one
                                winston.debug(`MM: Failed to send message ${msg.id}, trying next priority plugin...`)
                                return false
                            }
                        })
                        .catch(ServicechainManager.EmptyServicechainError, function (error) {
                            errs.log(error, error.message)
                            continue_trying = false
                            QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
                            return false
                        })
                } else { //end if continue_trying
                    // The message has been sent, no need to try with other plugins!
                    winston.info(`MM: Not trying with prio ${svc_priority}`)
                    return false
                }
            })
        })
            .catch(errs.NotFoundError, function (error) {
                errs.log(error.message, error)
                return false
            })
            .catch(Promise.TimeoutError, function (error) {
                errs.log(error.message, error)
                return false
            })
            .reduce(function (total, item: boolean) {
                if (total) {
                    return total
                } else {
                    return item
                }
            }, false)
            .then(function (message_sent_success) {
                if (message_sent_success) {
                    QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_SENT")
                    return Promise.resolve(msg)
                } else {
                    winston.info(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`)
                    QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
                    return Promise.reject(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`)
                }
            })
    }

    function sendMessageWithService(msg: db.MessageInstance, svc: db.ServiceInstance): Promise<boolean> {
        return PluginManager.getPluginById(svc.id)
            .then(function (plugin) {
                if (plugin) {
                    winston.debug(`MM: Loaded plugin ${plugin.name}`)
                    return ContactManager.getContactWithId(msg.contact)
                        .then(function (contact) {
                            if (contact) {
                                winston.debug(`MM: Found contact ${contact.id}, calling 'send_message() on plugin ${plugin.name} for message ${msg.id}...`)
                                return Promise.try(function () {
                                    let message_sent_success = plugin.send_message(msg, contact)
                                    // winston.info(`MM: Message send attempt state for message ${msg.id} with plugin ${plugin.name}: ${message_sent_success}`)
                                    return message_sent_success
                                }).timeout(30000, `Message ${msg.id} could not be sent within 30 seconds, timing out...`)
                            } else {
                                return Promise.reject(new errs.NotFoundError(`Could not find contact with ID ${msg.contact}`))
                            }
                        })
                } else {
                    return Promise.reject(new errs.NotFoundError(`Could not find plugin with ID ${svc.id}`))
                }
            }).catch(PluginManager.PluginImportFailedError, function (error) {
                errs.log(error.message, error)
                return Promise.reject(error)
            })
    }

    export function updateMessageState(msg_id: string, msg_state: string): Promise<db.MessageInstance> {
        winston.info("MM: Updating message state")
        return getMessageFromId(msg_id)
            .then(function (msg) {
                if (msg) {
                    msg.message_state = msg_state
                    return msg.save()
                } else {
                    winston.info(`MM: Could not find message with ID ${msg_id}`)
                    return Promise.reject(new errs.NotFoundError(`Message with ID ${msg_id} was not found`))
                }
            })
    }

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    export function getHundredMessageIds(offset: number = 0): Promise<Array<db.MessageInstance>> {
        return db.models.Message.findAll({
            offset: offset,
            limit: 100,
            order: [['id', 'DESC']]
        })
    }

    /**
     * Returns the details about a message with a given ID.
     * @param {Number} id The ID number of the message to retrieve.
     * @returns {promise} A Promise resolving to a row containing the details of the message.
     */
    export function getMessageFromId(id: string): Promise<db.MessageInstance | null> {
        return db.models.Message.findById(id)
    }
}