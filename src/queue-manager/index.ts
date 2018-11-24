import { MessageInstance } from "../models";
import { MessageManager } from "../message-manager"

const winston = require('winston')
import * as RedisSMQ from 'rsmq'
import * as redis from 'redis'
import * as rsmqWorker from 'rsmq-worker'
const errs = require('common-errors')

export namespace QueueManager {

    export interface MessageReceivedRequest {
        request_data: any,
        service_id: string
    }

    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient()//{ host: "127.0.0.1" })
    }

    let rsmq = new RedisSMQ({ client: client })

    if (rsmq.redis.server_info.redis_version) {
        winston.info("QM: Connected to redis server")
    } else {
        winston.error("QM: Failed to connect to redis server")
    }

    export function init_queues(): void {
        createQueues()

        let worker_send_msg_update = new rsmqWorker("message-state-update", { redis: client })
        worker_send_msg_update.on("message", function (message, next, message_id) {
            let update = JSON.parse(message)
            winston.debug("QM: Got message update for message " + update.message_id + ": " + update.status)
            MessageManager.updateMessageState(update.message_id, update.status)
                .catch(errs.NotFoundError, function (error) {
                    winston.info("QM: Dropping message update request for message with ID " + update.message_id)
                })
                .then(function () { next() })
        })
        worker_send_msg_update.start()

    }

    export function addMessageToSendRequest(message: MessageInstance) {
        winston.debug("QM: Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "message-send",
            message: JSON.stringify(message)
        }, function (err, resp) {
            if (resp) {
                winston.info("QM: Added send request for message " + message.id)
                return true
            } else {
                winston.error(err)
                throw err
            }
        })
    }

    export function addMessageStateUpdateRequest(message_id: string, message_state: string) {
        let q_msg = { message_id: message_id, status: message_state }
        rsmq.sendMessage({
            qname: "message-state-update",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                return true
            } else {
                winston.error(err)
                throw err
            }
        })
    }

    export function addMessageReceivedRequest(request_data: any, service_id: string) {
        let q_msg: MessageReceivedRequest = { request_data: request_data, service_id: service_id }
        winston.debug(`Sending queue message`)
        // console.log(JSON.stringify(q_msg))
        rsmq.sendMessage({
            qname: "message-recv",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                return true
            } else {
                winston.error(err)
                throw err
            }
        })
    }

    function createQueues() {
        let total_queue_list = ["message-send", "message-state-update", "message-recv"]
        let queues_to_create: string[] = []
        rsmq.listQueues(function (err, queues_in_redis) {
            if (err || !queues_in_redis) { winston.error(err) }
            else {
                queues_in_redis.forEach(function (queue_in_redis) {
                    total_queue_list.forEach(function (q_to_create) {
                        if (queue_in_redis == q_to_create) {
                            winston.info("Not creating queue " + q_to_create)
                        } else {
                            queues_to_create.push(q_to_create)
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