const winston = require('winston')
import * as Promise from "bluebird"
import * as events from "events"
import * as db from '../models'
import * as volubleErrors from '../voluble-errors'
import { ServicechainManager } from '../servicechain-manager'
import { PluginManager } from '../plugin-manager'
import { ContactManager } from '../contact-manager'
import { QueueManager } from '../queue-manager'
import servicechain from "../models/servicechain";
const errs = require('common-errors')

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
export namespace MessageManager {

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {Number} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {string} direction If this is an outbound message, false. If it's inbound, true. TODO: Make sure this is correct!
     * @param {Number} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered Numbero the database
     */
    export function createMessage(body: string, contact_id: number, direction: "INBOUND" | "OUTBOUND", is_reply_to: number | null = null,
        servicechain_id: number | null = null): Promise<db.MessageInstance> {

        return ContactManager.checkContactWithIDExists(contact_id)
            .catch(errs.NotFoundError, function (NFError) {
                winston.error(NFError)
                return Promise.reject(new volubleErrors.MessageFailedError(NFError))
            })

            .then(function (verified_contact_id) {
                if (servicechain_id){
                    return ServicechainManager.getServicechainById(servicechain_id)
                } else {
                    return ServicechainManager.getServicechainFromContactId(verified_contact_id)
                }
            })
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
    export function sendMessage(msg: db.MessageInstance): db.MessageInstance {
        Promise.try(function () {
            return QueueManager.addMessageToSendRequest(msg)
        })
            .catch(function () {
                return QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
            })

        return msg
    }

    export function doMessageSend(msg: db.MessageInstance) {//: Promise<boolean> {
        // First, acquire the first service in the servicechain

        return db.models.Servicechain.findById(msg.ServicechainId, {
            include: [
                {
                    model: db.models.Service,
                    through: {
                        where: {
                            priority: 1
                        }
                    }
                }
            ]
        })
            .then(function (sc) {
                if (sc) {
                    if (sc.Plugins.length) {
                        console.log("Found plug " + sc.Plugins[0].name)
                    } else {
                        console.log("Did not find plug")
                    }
                } else {
                    console.log("Did not find SC")
                }
            })
    }

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    export function getHundredMessageIds(offset: number): Promise<Array<db.MessageInstance>> {
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
    export function getMessageFromId(id: number): Promise<db.MessageInstance | null> {
        return db.models.Message.findById(id)
    }
}