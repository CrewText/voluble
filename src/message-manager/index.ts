import { WhereOptions } from 'sequelize/types'
import { errors, MessageDirections, MessageStates } from 'voluble-common'
import * as winston from 'winston'

import { ContactManager } from '../contact-manager'
import * as db from '../models'
import { Message } from '../models/message'
import { Service } from '../models/service'
import { PluginManager } from '../plugin-manager'
import { QueueManager } from '../queue-manager'
import { ServicechainManager } from '../servicechain-manager'


const logger = winston.loggers.get(process.title).child({ module: 'MessageMgr' })

export class MessageStateInvalidError extends Error { }

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
export class MessageManager {

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {string} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {string} direction If this is an outbound message, false. If it's inbound, true.
     * @param {string} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered into the database
     */
    public static async createMessage(body: string, contact_id: string, direction: "INBOUND" | "OUTBOUND", message_state: MessageStates,
        organization: string, servicechain_id?: string, is_reply_to?: string, user?: string, cost?: number): Promise<Message> {
        const msg_state = message_state ? message_state : MessageStates.MSG_PENDING

        const msg = db.models.Message.build({
            body: body,
            servicechain: servicechain_id,
            contact: contact_id,
            user: user,
            is_reply_to: is_reply_to,
            direction: direction == "INBOUND" ? MessageDirections.INBOUND : MessageDirections.OUTBOUND,
            message_state: msg_state,
            cost: cost,
            organization: organization
        })

        if (msg.body.includes("<title>") || msg.body.includes("<first_name>") || msg.body.includes("<surname>")) {
            const c = await ContactManager.getContactWithId(contact_id)
            msg.set('body', msg.body.replace("<title>", c.title))
            msg.set('body', msg.body.replace("<first_name>", c.first_name))
            msg.set('body', msg.body.replace("<surname>", c.surname))
        }

        return msg.save()
    }

    /**
     * Does what it says on the tin - attempts to send a message by finding the service in the messages' servicechain with priority 1.
     * @param {db.models.Sequelize.Message} msg A Message object representing the message to send.
     * @returns {db.models.Sequelize.message} The Sequelize message that has been sent.
     */
    public static sendMessage(msg: Message): Message {
        try {
            QueueManager.addMessageToSendRequest(msg)
        }
        catch {
            QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
        }

        return msg
    }

    public static async doMessageSend(msg: Message): Promise<Message> {
        // First, acquire the first service in the servicechain

        const sc = await ServicechainManager.getServicechainById(msg.servicechain)
        const svc_count = await sc.countServices()
        if (!svc_count) {
            QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED")
        }

        let is_sent = false

        logger.debug(`Beginning message send attempt loop`, { msg: msg.id, sc: sc.id, svc_count: svc_count })

        for (let current_svc_prio = 1; (current_svc_prio < svc_count + 1) && !is_sent; current_svc_prio++) {
            logger.debug(`Attempting to find plugin with priority ${current_svc_prio} in servicechain ${msg.servicechain}`)
            let svc: Service
            try {
                svc = await ServicechainManager.getServiceInServicechainByPriority(msg.servicechain, current_svc_prio)
                logger.debug(`Found service; Attempting message send`, { msg: msg.id, sc: sc.id, svc: svc.directory_name, priority: current_svc_prio })
                is_sent = await this.sendMessageWithService(msg, svc)
            } catch (e) {
                if (e instanceof errors.ResourceNotFoundError) {
                    logger.warn(e)
                } else {
                    logger.error(e)
                }
            }

            if (is_sent) {
                QueueManager.addMessageStateUpdateRequest(msg.id, MessageStates.MSG_DELIVERED_USER)
                QueueManager.addMessageSentTimeUpdateRequest(msg.id, Date.now())
                QueueManager.addMessageSentServiceUpdateRequest(msg.id, svc.id)
                return msg
            } else {
                // Wasn't able to send the message with this service, try the next one
                logger.debug(`Failed to send message ${msg.id}, trying next priority plugin...`)
            }
        }

        if (!is_sent) {
            logger.info(`Ran out of services for servicechain ${msg.servicechain}, message failed`)
            QueueManager.addMessageStateUpdateRequest(msg.id, MessageStates.MSG_FAILED)
            return Promise.reject(`Ran out of services for servicechain ${msg.servicechain}, message failed`)
        }
    }

    static async sendMessageWithService(msg: Message, svc: Service): Promise<boolean> {
        return Promise.all([PluginManager.getPluginById(svc.id), ContactManager.getContactWithId(msg.contact)])
            .then(async ([plugin, contact]) => {
                if (!contact) { throw new errors.ResourceNotFoundError(`Could not find contact with ID ${msg.contact}`) }
                logger.debug(`Found contact ${contact.id}, calling 'send_message() on plugin ${plugin.name} for message ${msg.id}...`)

                return plugin.send_message(msg, contact, await contact.getOrganization())
            })
            .catch(e => {
                logger.warn(e)
                throw e
            })
    }

    public static updateMessageState(msg_id: string, msg_state: string): Promise<Message> {
        logger.info("Updating message state", { 'msg': msg_id, 'state': MessageStates[msg_state] })
        return this.getMessageFromId(msg_id)
            .then(function (msg) {
                if (msg) {
                    if (msg_state in MessageStates) {
                        msg.message_state = MessageStates[msg_state]
                    } else {
                        return Promise.reject(new MessageStateInvalidError(`Message with ID ${msg_id} supplied invalid MessageState: ${msg_state}`))
                    }
                    return msg.save()
                } else {
                    logger.warn(`Could not find message with ID ${msg_id}`)
                    return Promise.reject(new errors.ResourceNotFoundError(`Message with ID ${msg_id} was not found`))
                }
            })
    }

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    public static async getMessages(offset = 0, limit = 100, organization?: string,
        startDate: Date = new Date(0), endDate = new Date(), contact?: string, direction?: MessageDirections,
        state?: MessageStates, user?: string): Promise<Array<Message>> {
        // Get all messages where the Contact is in the given Org.
        // If there isn't an Org, all messages where the contact's Org != null (which should be all of them)
        const whereopts: WhereOptions = {}

        if (direction) { whereopts['direction'] = direction }
        if (contact) { whereopts['contact'] = contact }
        if (user) { whereopts['user'] = user }
        if (state) { whereopts['message_state'] = state }

        return db.models.Message.findAll({
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']],
            where: {
                // @ts-ignore
                'createdAt': { [db.models.sequelize.Op.between]: [startDate, endDate] },
                ...whereopts
            },
            include: [
                {
                    model: db.models.Contact,
                    where: {
                        'organization': organization ? organization : { [db.models.sequelize.Op.ne]: null }
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
    public static getMessageFromId(id: string): Promise<Message | null> {
        return db.models.Message.findByPk(id)
    }

    public static getMessagesForContact(contact_id: string, offset = 0, limit = 0): Promise<Message[] | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (verified_contact_id) {
                return db.models.Message.findAll({
                    where: {
                        'contact': verified_contact_id
                    },
                    order: [['createdAt', 'DESC']],
                    limit: limit,
                    offset: offset
                })
            })
    }

    public static getRepliesToMessage(message_id: string): Promise<Message[]> {
        return db.models.Message.findAll({
            where: {
                is_reply_to: message_id
            }
        })
    }
}