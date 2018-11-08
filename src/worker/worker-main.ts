const winston = require('winston')
if (!process.env.IS_PRODUCTION) {
    winston.info("Main: Detected dev environment")
    winston.level = 'debug'
} else {
    winston.info("Main: Detected prod environment")
    winston.level = 'info'
}

import * as rsmqWorker from 'rsmq-worker'
import * as rsmq from 'rsmq'
import * as redis from 'redis'
import * as db from '../models'
const errs = require('common-errors')
import { MessageManager } from '../message-manager'
import { QueueManager } from '../queue-manager'
import { PluginManager } from '../plugin-manager'


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

worker_msg_recv.on("message", function (message: QueueManager.MessageReceivedRequest, next, message_id) {
    PluginManager.getPluginById(message.service_id)
        .then(function (plugin) {
            if (!plugin) { throw errs.NotFoundError(`Plugin not found with ID ${message.service_id}`) }
            return plugin.handle_incoming_message(message.request_data)
        })
        .then(function (message_info) {
            return MessageManager.createMessage(message_info.message_body, message_info.contact, "INBOUND", message_info.is_reply_to || null, null)
        })
})


client.on('error', function () {
    winston.error("Main: Failed to connect to the redis server!")
})
