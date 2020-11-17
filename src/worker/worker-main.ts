import * as redis from 'redis'
import * as rsmq from 'rsmq'
// import * as rsmqWorker from 'rsmq-worker'
import { Contact, errors, MessageStates, PlanTypes } from 'voluble-common'
import * as winston from 'winston'
import { ContactManager } from '../contact-manager'
import { MessageManager } from '../message-manager'
import { OrgManager } from '../org-manager'
import { PluginManager } from '../plugin-manager'
import { MessageReceivedRequest, QueueManager } from '../queue-manager'
import { RMQWorker } from '../RMQWorker'
import { getE164PhoneNumber } from '../utilities'




const logger = winston.loggers.add(process.title, {
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
        const unsent_msg = await MessageManager.getMessageFromId(parsed_msg_id)
        const msg = await MessageManager.doMessageSend(unsent_msg)
        const user = await msg.getUser()
        const org = await user.getOrganization()

        if (org.plan == PlanTypes.PAY_IN_ADVANCE) { org.decrement('credits', { by: msg.cost }) }
    } catch (e) {
        logger.error(e)
    }

    return next()

}).start()

worker_send_msg_update.on("message", async function (message, next) {
    let update;
    try {
        update = JSON.parse(message)
        logger.debug("Got message update for message " + update.message_id + ": " + update.status)
        await MessageManager.updateMessageState(update.message_id, update.status)
    }
    catch (error) {
        if (error instanceof errors.ResourceNotFoundError) {
            logger.info("Dropping message update request for message with ID " + update.message_id)
        } else { logger.error(error) }
    }
    return next()
}).start()

worker_msg_sent_time.on("message", async (message: string, next: () => void) => {
    const json_msg = JSON.parse(message)
    try {
        const msg = await MessageManager.getMessageFromId(json_msg.message_id)
        logger.debug(`Collected message-sent-time-update request for message`, { msg: json_msg.message_id, timestamp_ms: json_msg.timestamp })
        msg.sent_time = new Date(json_msg.timestamp)
        await msg.save()
    } catch (e) {
        logger.error(e)
    }

    return next()
}).start()

worker_msg_sent_service.on("message", async (message: string, next: () => void) => {
    const json_msg = JSON.parse(message)
    try {
        const msg = await MessageManager.getMessageFromId(json_msg.message_id)
        logger.debug(`Collected message-sent-service-update request for message`, { msg: json_msg.message_id, service: json_msg.sent_service })
        msg.sent_service = json_msg.sent_service
        await msg.save()
    } catch (e) {
        logger.error(e)
    }
    return next()
}).start()

worker_msg_recv.on("message", async (message: string, next) => {
    let identified_contact_id: string

    // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
    try {
        const incoming_message_request = <MessageReceivedRequest>JSON.parse(message)

        const plugin = await PluginManager.getPluginById(incoming_message_request.service_id)
        if (!plugin) { throw new errors.ResourceNotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
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

        if (message_info.resolved_contact_id) {
            // The contact has been found for us - use this and move on
            const contact = await ContactManager.getContactWithId(message_info.resolved_contact_id)
            if (!contact) {
                logger.warn(`InterpretedIncomingMessage supplied with Contact ID, but Contact not found!`, { contact_id: message_info.resolved_contact_id })
            } else {
                identified_contact_id = contact.id
            }
        } else {
            if (!message_info.phone_number_from && !message_info.phone_number_to && !message_info.email_address_from) {
                throw new InvalidMessageInfoError(`Invalid message_info supplied: Neither Contact ID, phone_number_from or email_address_from provided`)
            }
        }

        if (!identified_contact_id && message_info.is_reply_to) {
            // We can find the contact if it's a reply to a Message by using the Contact from the original message
            const outbound_message = await MessageManager.getMessageFromId(message_info.is_reply_to)
            if (!outbound_message) {
                logger.warn(`Message supplied as is_reply_to does not exist!`, { 'message_id': message_info.is_reply_to })
                // Nullify is_reply_to, so that if we find a Contact, the created Message doesn't try and associate with a Message that doesn't exist
                message_info.is_reply_to = null
            } else {
                identified_contact_id = await outbound_message.getContact().then((contact) => { return contact.id })
            }
        }

        if (!identified_contact_id && message_info.phone_number_to && message_info.phone_number_from) {
            // We can use the phone_number_to to find the Organization that the Message was destined for
            const orgs = await OrgManager.getOrganizationsByPhoneNumber(message_info.phone_number_to)
            if (!orgs) { throw new errors.ResourceNotFoundError("No Organization could be found with a phone number matching 'phone_number_to'.") }
            else {
                let potential_contacts: Contact[]

                // Get all the Contacts in all the Orgs this could be for
                const all_orgs_contacts = await Promise.all(orgs.map(org => org.getContacts({
                    where: {
                        phone_number: message_info.phone_number_from
                    }
                })))

                all_orgs_contacts.forEach(ctts_in_org => {
                    potential_contacts = potential_contacts.concat(ctts_in_org)
                });

                if (potential_contacts.length = 0) {
                    throw new errors.ResourceNotFoundError("No Organization could be found with a phone number matching 'phone_number_to' and a Contact with a phone number matching 'phone_number_from'.")
                } else if (potential_contacts.length == 1) {
                    identified_contact_id = potential_contacts[0].id
                } else {
                    logger.warn("More than one Organization has a phone number matching 'phone_number_to' and a Contact with a phone number matching 'phone_number_from'.")
                }
            }
        }

        if (!identified_contact_id && message_info.email_address_from) {
            const potential_contacts = await ContactManager.getContactsFromEmail(message_info.email_address_from)
            if (!potential_contacts.length) {
                throw new errors.ResourceNotFoundError("No Contact could be found with an email address matching 'email_address_from'.")
            } else if (potential_contacts.length == 1) {
                identified_contact_id = potential_contacts[0].id
            } else {
                logger.warn("More than one Contact has en email address matching 'email_address_from'.")
            }
        }

        if (!identified_contact_id) {
            throw new errors.ResourceNotFoundError(`Contact could not be identified!`)
        }

        // We've identified the Contact, so now just create the Message in the database
        const contact = await ContactManager.getContactWithId(identified_contact_id)

        logger.debug(`Creating new Message from inbound message`, { service: incoming_message_request.service_id, contact: contact.id })

        const new_message = await MessageManager.createMessage(
            message_info.message_body,
            contact.id,
            "INBOUND",
            MessageStates.MSG_ARRIVED,
            (await contact.getOrganization()).id,
            message_info.is_reply_to ? message_info.is_reply_to : null)

        logger.debug(`Created new inbound Message`, { message: new_message.id })

    } catch (e) {
        if (e instanceof EmptyMessageInfoError) {
            logger.warn(`Received inbound Message without any message_info! Could be a plugin-related service message...`)
        } else if (e instanceof errors.ResourceNotFoundError || e instanceof InvalidMessageInfoError) {
            logger.warn(`${e.name} ${e.message}`)
        } else {
            logger.error(`${e.name} ${e.message}`)
        }
    }
    return next()

}).start()

client.on('error', function () {
    logger.error("Main: Failed to connect to the redis server!")
})
