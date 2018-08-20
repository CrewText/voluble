import { MessageInstance } from "../models";
import { MessageManager } from "../message-manager"

const winston = require('winston')
import * as RedisSMQ from 'rsmq'
import * as redis from 'redis'
import * as rsmqWorker from 'rsmq-worker'
//import * as kue from 'kue'
const errs = require('common-errors')

export namespace QueueManager {
    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient()//{ host: "127.0.0.1" })
    }

    //let queue = kue.createQueue({redis:{createClientFactory: function(){return client}}})
    // let queue = kue.createQueue({ redis: process.env.REDISTOGO_URL || "redis://192.168.56.104" })
    // queue.on('error', function (err) {
    //     winston.error(err)
    // })

    let rsmq = new RedisSMQ({ client: client })

    if (rsmq.redis.server_info.redis_version) {
        winston.info("QM: Connected to redis server")
    } else {
        winston.error("QM: Failed to connect to redis server")
    }

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

    // queue.process('message-state-update', function (job, done) {
    //     winston.debug("QM: Got message update for message " + job.data.message_id + ": " + job.data.status)
    //     MessageManager.updateMessageState(job.data.message_id, job.data.status)
    //         .catch(errs.NotFoundError, function (error) {
    //             winston.info("QM: Dropping message update request for message with ID " + job.data.message_id)
    //         })
    //         .finally(function () { done() })
    // })

    export function addMessageToSendRequest(message: MessageInstance) {
        winston.debug("QM: Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "message-send",
            message: JSON.stringify(message)
        }, function (err, resp) {
            if (resp) {
                winston.info("QM: Added send request for message " + message.id)
                winston.debug("QM: " + resp)
                return true
            } else {
                winston.error(err)
                throw err
            }
        })

        // let job = queue.create('message-send', JSON.stringify(message)).save(function (error: any) {
        //     if (!error) {
        //         winston.info("QM: Added send request for message " + message.id)
        //         winston.debug("QM: Job ID: " + job.id)
        //     } else {
        //         winston.error(error)
        //         throw error
        //     }
        // })

    }

    export function addMessageStateUpdateRequest(message_id: number, message_state: string) {
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
            // })

            // let job = queue.create('message-state-update', {
            //     message_id: message_id,
            //     status: message_state
            // }).save(function (error: any) {
            //     if (!error) {
            //         return true
            //     } else {
            //         winston.error(error)
            //         throw error
            //     }
            // })
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