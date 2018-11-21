const winston = require('winston')
if (!process.env.IS_PRODUCTION) {
    winston.info("Main: Detected dev environment")
    winston.level = 'debug'
} else {
    winston.info("Main: Detected prod environment")
    winston.level = 'info'
}

import * as redis from 'redis';
import * as rsmq from 'rsmq';
import * as rsmqWorker from 'rsmq-worker';
import { MessageManager } from '../message-manager';
import * as db from '../models';
import { QueueManager } from '../queue-manager';
import { PluginManager } from '../plugin-manager'
import * as Promise from 'bluebird'
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
    Promise.try(function () {
        // The incoming message will be a serialized JSON of a QM.MessageReceivedRequest, so reconstitute it first to ensure type-correctness
        let incoming_message_request = <QueueManager.MessageReceivedRequest>JSON.parse(message)

        PluginManager.getPluginById(incoming_message_request.service_id)
            .then(function (plugin) {
                if (!plugin) { throw errs.NotFoundError(`Plugin not found with ID ${incoming_message_request.service_id}`) }
                winston.debug(`MAIN: Worker has received incoming message request for service with ID ${incoming_message_request.service_id}`)
                return plugin.handle_incoming_message(incoming_message_request.request_data)
            })
            .then(function (message_info) {
                return MessageManager.createMessage(message_info.message_body, message_info.contact, "INBOUND", message_info.is_reply_to || null, null, MessageManager.MessageStates.MSG_ARRIVED)
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
