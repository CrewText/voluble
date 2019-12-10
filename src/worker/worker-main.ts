import * as redis from 'redis'
import * as rsmq from 'rsmq'
import * as rsmqWorker from 'rsmq-worker'
import { MessageStates } from 'voluble-common'
import * as winston from 'winston'
import { ContactManager } from '../contact-manager'
import { MessageManager } from '../message-manager'
import { MessageInstance } from '../models'
import { PluginManager } from '../plugin-manager'
import { QueueManager } from '../queue-manager'
import { getE164PhoneNumber } from '../utilities'
import { ResourceNotFoundError } from '../voluble-errors'

let logger = winston.loggers.get('voluble-log').child({ module: 'Worker-Main' })

if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test") {
    logger.info("Main: Detected dev/test environment")
    // logger.level = 'debug'
} else {
    logger.info("Main: Detected prod environment")
    // logger.level = 'info'
}


class EmptyMessageInfoError extends Error { }
class InvalidMessageInfoError extends Error { }


logger.info("Main: Initializing worker process")

function createRedisClient() {
    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
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

let client = createRedisClient()
logger.debug("Main: conn ID " + client.connection_id)
let rsmq_client = new rsmq({ client: client })
let worker_msg_send = new rsmqWorker("message-send", { rsmq: rsmq_client })
let worker_msg_recv = new rsmqWorker("message-recv", { rsmq: rsmq_client })

worker_msg_send.on("message", async function (message, next, message_id) {
    let parsed_msg: MessageInstance = JSON.parse(message)
    logger.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
    QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING")
    logger.debug(`Main: Attempting message send`, { 'message': parsed_msg.id })
    try {
        await MessageManager.doMessageSend(parsed_msg)
    } catch (e) {
        logger.error(e)
    } finally {
        next()
    }
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
            let phone_number_e164 = getE164PhoneNumber(phone_number)

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

worker_msg_recv.on("message", async (message: string, next, message_id) => {
    let identified_contact_id: string

    // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
    try {
        let incoming_message_request = <QueueManager.MessageReceivedRequest>JSON.parse(message)

        let plugin = await PluginManager.getPluginById(incoming_message_request.service_id)
        if (!plugin) { throw new ResourceNotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
        logger.debug(`MAIN: Worker has received incoming message request for service with ID ${incoming_message_request.service_id}`)

        let message_info = await plugin.handle_incoming_message(incoming_message_request.request_data)

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
            let contact = await ContactManager.getContactWithId(message_info.contact_id)
            if (!contact) {
                logger.warn(`InterpretedIncomingMessage supplied with Contact ID, but Contact not found!`, { contact_id: message_info.contact_id })
            } else {
                identified_contact_id = contact.id
            }
        }

        if (!identified_contact_id && message_info.is_reply_to) {
            let outbound_message = await MessageManager.getMessageFromId(message_info.is_reply_to)
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
            let attempted_ident = await attemptContactIdentification(message_info.phone_number, message_info.email_address)
            if (attempted_ident) { identified_contact_id = attempted_ident }
        }

        if (!identified_contact_id) {
            throw new ResourceNotFoundError(`Contact could not be identified!`)
        }

        // We've identified the Contact, so now just create the Message in the database

        let contact = await ContactManager.getContactWithId(identified_contact_id)
        let sc = await contact.getServicechain()

        logger.debug(`Creating new Message from inbound message`, { service: incoming_message_request.service_id, contact: contact.id })

        let new_message = await MessageManager.createMessage(message_info.message_body,
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
