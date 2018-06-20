const winston = require('winston')
import * as Promise from "bluebird"
import * as events from "events"
import * as db from '../models'
import * as volubleErrors from '../voluble-errors'
import { ServicechainManager } from '../servicechain-manager'
import { PluginManager } from '../plugin-manager'
import { ContactManager } from '../contact-manager'
import { QueueManager } from '../queue-manager'
import { MessageInstance } from "../models/message";
import { ServicesInSCInstance } from "../models/servicesInServicechain";
import { PluginInstance } from "../models/plugin";
const errs = require('common-errors')

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
export namespace MessageManager {

    let eventEmitter = new events.EventEmitter()
    eventEmitter.on('send-message', doMessageSend)
    eventEmitter.on('message-failed', onMessageFailed)
    eventEmitter.on('message-sent', onMessageSent)

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {Number} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {string} direction If this is an outbound message, false. If it's inbound, true. TODO: Make sure this is correct!
     * @param {Number} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered Numbero the database
     */
    export function createMessage(body: string, contact_id: number, direction: "INBOUND" | "OUTBOUND", is_reply_to: number | null = null): Promise<MessageInstance> {

        ContactManager.checkContactWithIDExists(contact_id)
            .catch(errs.NotFoundError, function (NFError) {
                winston.error(NFError)
                return Promise.reject(volubleErrors.MessageFailedError(NFError))
            })

        return ServicechainManager.getServicechainFromContactId(contact_id)
            .then(function (servicechain) {
                if (servicechain) {
                    let msg = db.models.Message.build({
                        body: body,
                        ServicechainId: servicechain.id,
                        contact: contact_id,
                        is_reply_to: is_reply_to,
                        direction: direction,
                        message_state: 'MSG_PENDING'
                    })

                    return msg.save()
                }
                else {
                    return Promise.reject(new errs.NotFoundError(`Could not find servicechain for contact ${contact_id}`))
                }
            })
    }

    /**
     * Does what it says on the tin - attempts to send a message by finding the service in the messages' servicechain with priority 1.
     * @param {db.models.Sequelize.Message} msg A Message object (TODO: or id?) representing the message to send.
     * @returns {promise} Promise resolving to the Sequelize message that has been sent.
     */
    export function sendMessage(msg: MessageInstance): MessageInstance {
        Promise.try(function () {
            return QueueManager.sendMessage(msg)
        })
            .then(function () {
                return QueueManager.updateMessageState(msg.id, "MSG_SENT")
            })
            .catch(function () {
                return QueueManager.updateMessageState(msg.id, "MSG_FAILED")
            })

        return msg
    }

    function doMessageSend(msg: MessageInstance) {
        winston.info("Beginning message send process", { message_id: msg.id, message_state: msg.message_state })
        return Promise.filter(ServicechainManager.getServicesInServicechain(msg.ServicechainId), function (svcInSC: ServicesInSCInstance) {
            return svcInSC.priority == 1
        })
            .then(function (servicesInSC) {
                if (!servicesInSC || servicesInSC.length < 1) {
                    return Promise.reject(volubleErrors.MessageFailedError("No plugins in servicechain with priority 1"))
                }

                let svcInSC = servicesInSC[0]

                return PluginManager.getServiceById(svcInSC.service_id)
                    .then(function (svc) {
                        if (svc) {
                            return sendMessageWithService(msg, svc)
                        }
                        else {
                            throw new errs.errs.NotFoundError("Could not find service with ID " + svcInSC.service_id)
                        }
                    })

            })
            .then(function () {
                return msg.reload()
            })
    }



    function onMessageFailed(msg: MessageInstance, svc: PluginInstance) {
        // To do this, figure out which servicechain we're using, then find out where the plugin that's called the update sits.
        // If there's one after in the SC, call sendMessageWithService with the next plugin. If not, fail.
        winston.debug(`Finding priority of service with ID ${svc.id} in SC ${msg.servicechain}`)
        db.models.ServicesInSC.findOne({
            where: {
                servicechain_id: msg.servicechain,
                service_id: svc.id
            }
        })
            .then(function (currentSvcInSC) {
                if (!currentSvcInSC) {
                    throw new errs.errs.NotFoundError("Could not find current service in servicechain")
                }
                return db.models.ServicesInSC.findOne({
                    where: {
                        servicechain_id: msg.servicechain,
                        priority: currentSvcInSC.priority + 1
                    }
                })
            })
            .then(function (nextSvcInSC) {
                if (!nextSvcInSC) { return Promise.reject(new errs.NotFoundError("Couldn't find another service in servicechain, message " + msg.id + " failed")) }
                return PluginManager.getServiceById(nextSvcInSC.service_id)
            })
            .then(function (nextSvc) {
                if (nextSvc) {
                    return sendMessageWithService(msg, nextSvc)
                } else {
                    throw new errs.NotFoundError("Could not find next service in servicechain for message " + msg.id)
                }
            })
            .catch(errs.NotFoundError, function (err: any) {
                winston.info("Message " + msg.id + " failed to send:\n" + err)
            })
    }

    function onMessageSent(msg: MessageInstance, message_state: string) {
        msg.sent_time = db.models.Sequelize.fn('NOW')
        return msg.save()
    }

    /**
     * This is called when a messages' state changes. Determine the correct course of action depending on the new message state.
     * @param {Sequelize.Message} msg The message whose state will be updated
     * @param {string} message_state The new message state for the message
     * @param {Sequelize.Plugin} svc The service that initiated the state change.
     */
    export function updateMessageState(msg: MessageInstance, message_state: string, svc?: PluginInstance) {
        winston.info("New message state", { msg: msg.id, state: message_state })
        msg.message_state = message_state
        return msg.save()
            .then(function (msg) {
                switch (message_state) {
                    case "MSG_FAILED":
                        eventEmitter.emit('message-failed', msg, svc)
                        break
                    case "MSG_SENT":
                        eventEmitter.emit('message-sent', msg)
                        break
                }
            })
            .catch(db.models.Sequelize.ValidationError, function (err: any) {
                winston.error("Could not update message state:\n" + err)
                return Promise.reject(err)
            })
    }

    /**
     * Sends a given message with the specified plugins' `send_message` method.
     * @param {Sequelize.Message} msg The message to attempt to send
     * @param {Sequelize.Plugin} service The service with which to attempt to send the message
     * @returns {promise} A promise that resolves to whatever the plugin returns
     */
    export function sendMessageWithService(msg: MessageInstance, service: PluginInstance) {
        winston.debug("Attempting to send message " + msg.id + " with plugin " + service.name)
        MessageManager.updateMessageState(msg, "MSG_SENDING")
            .then(function () {
                PluginManager.getPluginById(service.id)
                    .then(function (plugin) {
                        ContactManager.getContactWithId(msg.contact)
                            .then(function (contact) {
                                return Promise.try(function () {
                                    return plugin.send_message(msg, contact)
                                })
                            })
                    })
                    .catch(volubleErrors.PluginDoesNotExistError, errs.NotFoundError, function (err: any) {
                        winston.debug("Active plugin with ID " + service.id + " not found")
                        return MessageManager.updateMessageState(msg, "MSG_FAILED", service)
                    })
            })
    }

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    export function getHundredMessageIds(offset: number): Promise<Array<MessageInstance>> {
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
    export function getMessageFromId(id: number): Promise<MessageInstance | null> {
        return db.models.Message.findById(id)
    }
}