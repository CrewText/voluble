import * as redis from 'redis'
import * as rsmq from 'rsmq'
// import * as rsmqWorker from 'rsmq-worker'
import { MessageStates, PlanTypes } from 'voluble-common'
import * as winston from 'winston'

import { ContactManager } from '../contact-manager'
import { MessageManager } from '../message-manager'
import { PluginManager } from '../plugin-manager'
import { MessageReceivedRequest, QueueManager, RMQWorker } from '../queue-manager'
import { getE164PhoneNumber } from '../utilities'
import { ResourceNotFoundError } from '../voluble-errors'

const logger = winston.loggers.add(process.mainModule.filename, {
    format: winston.format.combine(winston.format.json(), winston.format.prettyPrint()),
    defaultMeta: { module: 'Worker-Main' }
})
logger.level = process.env.NODE_ENV === "production" ? "info" : "debug"
logger.add(new winston.transports.Console())

if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test") {
    logger.info("Main: Detected dev/test environment")
} else {
    logger.info("Main: Detected prod environment")
}

class EmptyMessageInfoError extends Error { }
class InvalidMessageInfoError extends Error { }

logger.info("Main: Initializing worker process")

function createRedisClient() {
    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        const rtg = require("url").parse(process.env.REDISTOGO_URL);
        logger.info(`Connecting to Redis server at ${rtg.hostname}:${rtg.port}`)
        client = redis.createClient(rtg.port, rtg.hostname)
        logger.info(`Connected to Redis server; now authorizing`)
        client.auth(rtg.auth.split(":")[1]);
        logger.info(`Successfully authorized`)
    } else {
        logger.warn(`No REDISTOGO_URL variable found, using localhost...`)
        client = redis.createClient()
    }
    return client
}

const client = createRedisClient()
logger.debug("Main: conn ID " + client.connection_id)
const rsmq_client = new rsmq({ client: client })
const worker_msg_send = new RMQWorker("message-send", rsmq_client)
const worker_msg_recv = new RMQWorker("message-recv", rsmq_client)
const worker_msg_sent_service = new RMQWorker("message-sent-service-update", rsmq_client)
const worker_msg_sent_time = new RMQWorker("message-sent-time-update", rsmq_client)
const worker_send_msg_update = new RMQWorker("message-state-update", rsmq_client)

worker_msg_send.on("message", async function (message: string, next: () => void) {
    const parsed_msg_id: string = message
    logger.debug(`Main: Worker has collected message ${parsed_msg_id} for sending`)
    QueueManager.addMessageStateUpdateRequest(parsed_msg_id, "MSG_SENDING")
    logger.debug(`Main: Attempting message send`, { 'message': parsed_msg_id })
    try {
        const msg = await MessageManager.getMessageFromId(parsed_msg_id)
        await MessageManager.doMessageSend(msg)
            .then(msg => {
                return msg.getUser()
                    .then(user => {
                        return user.getOrganization()
                    })
                    .then(org => {
                        if (org.plan == PlanTypes.PAY_IN_ADVANCE) {
                            return org.decrement('credits', { by: msg.cost })
                        }
                        else return
                    })
            })
    } catch (e) {
        logger.error(e)
    } finally {
        next()
    }
}).start()

worker_send_msg_update.on("message", function (message, next) {
    const update = JSON.parse(message)
    logger.debug("Got message update for message " + update.message_id + ": " + update.status)
    MessageManager.updateMessageState(update.message_id, update.status)
        .catch(function (error) {
            if (error instanceof ResourceNotFoundError) {
                logger.info("Dropping message update request for message with ID " + update.message_id)
            } else {
                throw error
            }
        })
        .finally(function () { next() })
}).start()

worker_msg_sent_time.on("message", (message: string, next: () => void) => {
    const json_msg = JSON.parse(message)
    MessageManager.getMessageFromId(json_msg.message_id)
        .then(msg => {
            logger.debug(`Collected message-sent-time-update request for message`, { msg: json_msg.message_id, timestamp_ms: json_msg.timestamp })
            msg.sent_time = new Date(json_msg.timestamp)
            return msg.save()
        })
        .catch(e => {
            logger.error(e)
            throw e
        })
        .finally(() => {
            next()
        })
}).start()

worker_msg_sent_service.on("message", (message: string, next: () => void) => {
    const json_msg = JSON.parse(message)
    MessageManager.getMessageFromId(json_msg.message_id)
        .then((msg) => {
            logger.debug(`Collected message-sent-service-update request for message`, { msg: json_msg.message_id, service: json_msg.sent_service })
            msg.sent_service = json_msg.sent_service
            return msg.save()
        })
        .catch(e => {
            logger.error(e)
            throw e
        })
        .finally(() => {
            next()
        })
}).start()

/**
 * Attempts to identify which Contact sent an inbound Message by using it's contact details as supplied by the receiving plugin
 * @param phone_number The phone number supplied by the plugin as a way of attempting to identify the Contact
 * @param email_address The email address supplied by the plugin as a way of attempting to identify the Contact
 * @returns The ID of the Contact that this Message is from, or `null` if it cannot be identified
 */
async function attemptContactIdentification(phone_number?: string, email_address?: string): Promise<string | null> {
    if (!phone_number && !email_address) {
        return null
    }

    // First, try and identify from the phone number
    if (phone_number) {
        try {
            phone_number = phone_number.startsWith("+") ? phone_number : `+${phone_number}`
            // The contact ID has not been supplied, we need to try and determine it from the phone number
            const phone_number_e164 = getE164PhoneNumber(phone_number)

            return await ContactManager.getContactFromPhone(phone_number_e164)
                .then(function (contact) {
                    if (contact) {
                        return contact.id
                    } else {
                        throw new ResourceNotFoundError(`No contact found with phone number ${phone_number} (parsed as ${phone_number_e164})`)
                    }
                })
        } catch (e) {
            logger.warn(`Could not identify inbound contact from phone number: ${e.name}: ${e.message}`)
        }
    }

    if (email_address) {
        // Neither the contact ID or the phone number are supplied, we need to determine it from the email address
        try {
            return ContactManager.getContactFromEmail(email_address)
                .then(function (contact) {
                    if (contact) {
                        return contact.id
                    } else {
                        throw new ResourceNotFoundError(`No contact found with email ${email_address}`)
                    }
                })
        } catch (e) {
            logger.warn(`Could not identify inbound contact from email address: ${e.name}: ${e.message}`)
        }
    }

    // We haven't been able to identify the Contact by the phone number or email
    return null
}

worker_msg_recv.on("message", async (message: string, next) => {
    let identified_contact_id: string

    // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
    try {
        const incoming_message_request = <MessageReceivedRequest>JSON.parse(message)

        const plugin = await PluginManager.getPluginById(incoming_message_request.service_id)
        if (!plugin) { throw new ResourceNotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
        logger.debug(`Received incoming message request for service with ID ${incoming_message_request.service_id}`)

        const message_info = await plugin.handle_incoming_message(incoming_message_request.request_data)

        /* At this point, the plugin has returned an InterpretedIncomingMessage.
        * This contains the message body, and if the plugin has been able to identify the origin contact, the contacts' ID.
        * However, if not, it must contain one of the following: contact phone number or contact email.
        * This is so voluble can attempt to determine the origin of the message.
        * It may also contain the is_reply_to field.
        */
        if (!message_info) {
            throw new EmptyMessageInfoError()
        }

        if (message_info.contact_id) {
            const contact = await ContactManager.getContactWithId(message_info.contact_id)
            if (!contact) {
                logger.warn(`InterpretedIncomingMessage supplied with Contact ID, but Contact not found!`, { contact_id: message_info.contact_id })
            } else {
                identified_contact_id = contact.id
            }
        }

        if (!identified_contact_id && message_info.is_reply_to) {
            const outbound_message = await MessageManager.getMessageFromId(message_info.is_reply_to)
            if (!outbound_message) {
                logger.warn(`Message supplied as is_reply_to does not exist!`, { 'message_id': message_info.is_reply_to })
            } else {
                identified_contact_id = await outbound_message.getContact().then((contact) => { return contact.id })
            }
        }

        if (!message_info.contact_id && !(message_info.phone_number || message_info.email_address)) {
            throw new InvalidMessageInfoError(`Invalid message_info supplied: Neither Contact ID, phone_number or email_address provided`)
        }

        if (!identified_contact_id && (message_info.phone_number || message_info.email_address)) {
            const attempted_ident = await attemptContactIdentification(message_info.phone_number, message_info.email_address)
            if (attempted_ident) { identified_contact_id = attempted_ident }
        }

        if (!identified_contact_id) {
            throw new ResourceNotFoundError(`Contact could not be identified!`)
        }

        // We've identified the Contact, so now just create the Message in the database

        const contact = await ContactManager.getContactWithId(identified_contact_id)
        const sc = await contact.getServicechain()

        logger.debug(`Creating new Message from inbound message`, { service: incoming_message_request.service_id, contact: contact.id })

        const new_message = await MessageManager.createMessage(message_info.message_body,
            contact.id,
            "INBOUND",
            MessageStates.MSG_ARRIVED,
            sc ? sc.id : null,
            message_info.is_reply_to ? message_info.is_reply_to : null)

        logger.debug(`Created new inbound Message`, { message: new_message.id })

    } catch (e) {
        if (e instanceof EmptyMessageInfoError) {
            logger.warn(`Received inbound Message without any message_info! Could be a plugin-related service message...`)
        } else if (e instanceof ResourceNotFoundError || e instanceof InvalidMessageInfoError) {
            logger.warn(`${e.name} ${e.message}`)
        } else {
            logger.error(`${e.name} ${e.message}`)
        }
    } finally {
        next()
    }
}).start()

client.on('error', function () {
    logger.error("Main: Failed to connect to the redis server!")
})
