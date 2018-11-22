"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require('winston');
if (!process.env.IS_PRODUCTION) {
    winston.info("Main: Detected dev environment");
    winston.level = 'debug';
}
else {
    winston.info("Main: Detected prod environment");
    winston.level = 'info';
}
const redis = require("redis");
const rsmq = require("rsmq");
const rsmqWorker = require("rsmq-worker");
const message_manager_1 = require("../message-manager");
const queue_manager_1 = require("../queue-manager");
const plugin_manager_1 = require("../plugin-manager");
const Promise = require("bluebird");
const contact_manager_1 = require("../contact-manager");
const errs = require('common-errors');
winston.info("Main: Initializing worker process");
function createRedisClient() {
    let client;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname);
        client.auth(rtg.auth.split(":")[1]);
    }
    else {
        client = redis.createClient();
    }
    return client;
}
let client = createRedisClient();
winston.debug("Main: conn ID " + client.connection_id);
let worker_msg_send = new rsmqWorker("message-send", { redis: client });
let worker_msg_recv = new rsmqWorker("message-recv", { redis: client });
let rsmq_client = new rsmq({ client: client });
worker_msg_send.on("message", function (message, next, message_id) {
    let parsed_msg = JSON.parse(message);
    winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`);
    queue_manager_1.QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING");
    winston.debug(`Main: Attempting message send for message ${parsed_msg.id}`);
    message_manager_1.MessageManager.doMessageSend(parsed_msg).finally(function () {
        next();
    });
}).start();
worker_msg_recv.on("message", function (message, next, message_id) {
    Promise.try(function () {
        let incoming_message_request = JSON.parse(message);
        plugin_manager_1.PluginManager.getPluginById(incoming_message_request.service_id)
            .then(function (plugin) {
            if (!plugin) {
                throw errs.NotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`);
            }
            winston.debug(`MAIN: Worker has received incoming message request for service with ID ${incoming_message_request.service_id}`);
            return plugin.handle_incoming_message(incoming_message_request.request_data);
        })
            .then(function (message_info) {
            Promise.try(function () {
                if (message_info.contact_id) {
                    return message_info.contact_id;
                }
                else if (message_info.phone_number) {
                    return contact_manager_1.ContactManager.getContactFromPhone(message_info.phone_number)
                        .then(function (contact) {
                        if (contact) {
                            return contact.id;
                        }
                        else {
                            throw new errs.NotFoundError(`No contact found with phone number ${message_info.phone_number}`);
                        }
                    });
                }
                else if (message_info.email_address) {
                    return contact_manager_1.ContactManager.getContactFromEmail(message_info.email_address)
                        .then(function (contact) {
                        if (contact) {
                            return contact.id;
                        }
                        else {
                            throw new errs.NotFoundError(`No contact found with email ${message_info.email_address}`);
                        }
                    });
                }
                else {
                    throw new errs.ArgumentError(`Plugin did not specify contact details for incoming message!`);
                }
            }).then(function (determined_contact_id) {
                return message_manager_1.MessageManager.createMessage(message_info.message_body, determined_contact_id, "INBOUND", message_info.is_reply_to || null, null, message_manager_1.MessageManager.MessageStates.MSG_ARRIVED);
            });
        })
            .catch(errs.NotFoundError, function (err) {
            errs.log(err, err.message);
        });
    })
        .finally(function () {
        next();
    });
}).start();
client.on('error', function () {
    winston.error("Main: Failed to connect to the redis server!");
});
