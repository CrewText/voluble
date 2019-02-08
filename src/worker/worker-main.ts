const winston = require('winston')
if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test") {
    winston.info("Main: Detected dev environment")
    winston.level = 'debug'
} else {
    winston.info("Main: Detected prod environment")
    winston.level = 'info'
}

import * as Promise from 'bluebird';
import * as redis from 'redis';
import * as rsmq from 'rsmq';
import * as rsmqWorker from 'rsmq-worker';
import { MessageStates } from 'voluble-common';
import { ContactManager } from '../contact-manager';
import { MessageManager } from '../message-manager';
import * as db from '../models';
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

worker_msg_send.on("message", function (message, next, message_id) {
    let parsed_msg: db.MessageInstance = JSON.parse(message)
    winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
    QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING")
    winston.debug(`Main: Attempting message send for message ${parsed_msg.id}`)
    MessageManager.doMessageSend(parsed_msg).finally(function () {
        next()
    })
}).start()

worker_msg_recv.on("message", function (message: string, next, message_id) {
    return Promise.try(function () {
        // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
        let incoming_message_request = <QueueManager.MessageReceivedRequest>JSON.parse(message)

        PluginManager.getPluginById(incoming_message_request.service_id)
            .then(function (plugin) {
                if (!plugin) { throw errs.NotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
                winston.debug(`MAIN: Worker has received incoming message request for service with ID ${incoming_message_request.service_id}`)
                return plugin.handle_incoming_message(incoming_message_request.request_data)
            })
            .then(function (message_info) {
                /* At this point, the plugin has returned an InterpretedIncomingMessage.
                * This contains the message body, and if the plugin has been able to identify the origin contact, the contacts' ID.
                * However, if not, it must contain one of the following: contact phone number or contact email.
                * This is so voluble can attempt to determine the origin of the message.
                * It may also contain the is_reply_to field.
                */

                return Promise.try(function () {
                    if (message_info.contact_id) {
                        return ContactManager.checkContactWithIDExists(message_info.contact_id)
                            .then(function () {
                                return message_info.contact_id
                            })
                    }
                    else if (message_info.phone_number) {
                        // The contact ID has not been supplied, we need to try and determine it from the phone number
                        let phone_number_e164 = getE164PhoneNumber("+" + message_info.phone_number) // Esendex misses the leading +

                        // TODO: What if we can't determine the phone number or it won't parse?

                        return ContactManager.getContactFromPhone(phone_number_e164)
                            .then(function (contact) {
                                if (contact) {
                                    return contact.id
                                } else {
                                    throw new errs.NotFoundError(`No contact found with phone number ${message_info.phone_number} (parsed as ${phone_number_e164})`)
                                }
                            })
                    } else if (message_info.email_address) {
                        // Neither the contact ID or the phone number are supplied, we need to determine it from the email address
                        return ContactManager.getContactFromEmail(message_info.email_address)
                            .then(function (contact) {
                                if (contact) {
                                    return contact.id
                                } else {
                                    throw new errs.NotFoundError(`No contact found with email ${message_info.email_address}`)
                                }
                            })
                    } else {
                        // plugin has not specified any crucial information
                        //TODO: What do we do now?
                        throw new errs.ArgumentError(`Plugin did not specify contact details for incoming message!`)
                    }
                }).then(function (determined_contact_id) {
                    return ContactManager.getContactWithId(determined_contact_id)
                        .then(function (contact) {
                            return contact.getServicechain()
                                .then(function (sc) {
                                    return MessageManager.createMessage(message_info.message_body,
                                        determined_contact_id,
                                        "INBOUND",
                                        MessageStates.MSG_ARRIVED,
                                        sc ? sc.id : null)
                                })
                        })
                })
            })
            .catch(errs.NotFoundError, function (err) {
                errs.log(err, err.message)
            })
    })
        .finally(function () {
            next()
        })
}).start()


client.on('error', function () {
    winston.error("Main: Failed to connect to the redis server!")
})
