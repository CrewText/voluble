import { MessageInstance } from "../models";
import { MessageManager } from "../message-manager"

const winston = require('winston')
import * as RedisSMQ from 'rsmq'
import * as redis from 'redis'
import * as rsmqWorker from 'rsmq-worker'

export namespace QueueManager {
    let client;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient({ host: "192.168.56.104" })
    }

    let rsmq = new RedisSMQ({ client: client })
    if (rsmq.redis.server_info.redis_version) {
        winston.info("Connected to redis server")
    } else {
        winston.error("Failed to connect to redis server")
    }

    createQueues()

    let worker_send_msg_update = new rsmqWorker("message-state-update", { redis: client })
    worker_send_msg_update.on("message", function (message, next, message_id) {
        let update = JSON.parse(message)
        winston.debug("Got message update for message " + update.message_id + ": " + update.status)
        let msg_inst = MessageManager.getMessageFromId(update.message_id)
            .then(function (msg_inst) {
                if (msg_inst) {
                    MessageManager.updateMessageState(msg_inst, update.status)
                }
            })
        next()
    })
    worker_send_msg_update.start()

    export function sendMessage(message: MessageInstance) {
        winston.debug("Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "message-send",
            message: JSON.stringify(message)
        }, function (err, resp) {
            if (resp) {
                winston.info("Sent message " + message.id)
            } else {
                winston.error(err)
            }
        })
    }

    function createQueues() {
        let queues_to_create = ["message-send", "message-state-update"]
        rsmq.listQueues(function (err, queues) {
            if (err || !queues) { winston.error(err) }
            else {
                queues.forEach(function (queue) {
                    queues_to_create.forEach(function (q_to_create) {
                        if (queue == q_to_create) {
                            winston.info("Not creating queue " + q_to_create)
                            queues_to_create.splice(queues_to_create.indexOf(q_to_create))
                        }
                    })
                })

                queues_to_create.forEach(function (queue_to_create) {
                    rsmq.createQueue({ qname: queue_to_create }, function (error, resp) {
                        if (resp) { winston.info("Created queue " + queue_to_create) }
                    })
                })
            }
        })
    }

}