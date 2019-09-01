const winston = require('winston')
if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test") {
    winston.info("Main: Detected dev environment")
    winston.level = 'debug'
} else {
    winston.info("Main: Detected prod environment")
    winston.level = 'info'
}

// import * as Promise from 'bluebird';
import * as redis from 'redis';
import * as rsmq from 'rsmq';
import * as rsmqWorker from 'rsmq-worker';
import { MessageStates } from 'voluble-common';
import { ContactManager } from '../contact-manager';
import { MessageManager } from '../message-manager';
import * as db from '../models';
import { ContactInstance } from '../models/contact';
import { PluginManager } from '../plugin-manager';
import { QueueManager } from '../queue-manager';
import { getE164PhoneNumber } from '../utilities';
const errs = require('common-errors')


winston.info("Main: Initializing worker process")

function createRedisClient() {
    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient()//{ host: "192.168.56.104" })
    }
    return client
}

let client = createRedisClient()
winston.debug("Main: conn ID " + client.connection_id)
let worker_msg_send = new rsmqWorker("message-send", { redis: client })
let worker_msg_recv = new rsmqWorker("message-recv", { redis: client })
let rsmq_client = new rsmq({ client: client })

worker_msg_send.on("message", async function (message, next, message_id) {
    let parsed_msg: db.MessageInstance = JSON.parse(message)
    winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
    QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING")
    winston.debug(`Main: Attempting message send for message ${parsed_msg.id}`)
    await MessageManager.doMessageSend(parsed_msg)
    next()
}).start()

async function attemptContactIdentification(phone_number?: string, email_address?: string): Promise<string | null> {
    if (!phone_number && !email_address) {
        return null
    }

    if (phone_number) {
        // The contact ID has not been supplied, we need to try and determine it from the phone number
        let phone_number_e164 = getE164PhoneNumber("+" + phone_number) // Esendex misses the leading +

        // TODO: What if we can't determine the phone number or it won't parse?

        return await ContactManager.getContactFromPhone(phone_number_e164)
            .then(function (contact) {
                if (contact) {
                    return contact.id
                } else {
                    throw new errs.NotFoundError(`No contact found with phone number ${phone_number} (parsed as ${phone_number_e164})`)
                }
            })
    } else if (email_address) {
        // Neither the contact ID or the phone number are supplied, we need to determine it from the email address
        return ContactManager.getContactFromEmail(email_address)
            .then(function (contact) {
                if (contact) {
                    return contact.id
                } else {
                    throw new errs.NotFoundError(`No contact found with email ${email_address}`)
                }
            })

    }
}

worker_msg_recv.on("message", async (message: string, next, message_id) => {
    // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
    let incoming_message_request = <QueueManager.MessageReceivedRequest>JSON.parse(message)

    await PluginManager.getPluginById(incoming_message_request.service_id)
        .then((plugin) => {
            if (!plugin) { throw errs.NotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
            winston.debug(`MAIN: Worker has received incoming message request for service with ID ${incoming_message_request.service_id}`)
            return plugin.handle_incoming_message(incoming_message_request.request_data)
        })
        .then((message_info) => {
            /* At this point, the plugin has returned an InterpretedIncomingMessage.
                * This contains the message body, and if the plugin has been able to identify the origin contact, the contacts' ID.
                * However, if not, it must contain one of the following: contact phone number or contact email.
                * This is so voluble can attempt to determine the origin of the message.
                * It may also contain the is_reply_to field.
                */

            return new Promise<string>((resolve, reject) => {
                if (message_info.contact_id) {
                    return ContactManager.checkContactWithIDExists(message_info.contact_id)
                        .then(() => {
                            return message_info.contact_id
                        })
                } else if (message_info.phone_number || message_info.email_address) {
                    return attemptContactIdentification(message_info.phone_number, message_info.email_address)
                } else {
                    // plugin has not specified any crucial information
                    //TODO: What do we do now?
                    throw new errs.ArgumentError(`Plugin did not specify contact details for incoming message!`)
                }
            }).then((determined_contact_id) => {
                return ContactManager.getContactWithId(determined_contact_id)
                    .then((contact) => {
                        return contact.getServicechain()
                    })
                    .then((sc) => {
                        return MessageManager.createMessage(message_info.message_body,
                            determined_contact_id,
                            "INBOUND",
                            MessageStates.MSG_ARRIVED,
                            sc ? sc.id : null)
                    })
            }).catch((err) => {
                if (err instanceof errs.NotFoundError) {
                    errs.log(err, err.message)
                }
                else {
                    throw err
                }
            })
        })
    next()
}).start()

client.on('error', function () {
    winston.error("Main: Failed to connect to the redis server!")
})
