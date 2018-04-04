import { MessageInstance } from "../../models";

const winston = require('winston')
import * as RedisSMQ from 'rsmq'
import * as redis from 'redis'

export namespace QueueManager {
    let client;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
        winston.info("Created remote client")
    } else {
        client = redis.createClient({host:"192.168.56.104"})
        winston.info("Created local client")
    }

    let rsmq = new RedisSMQ({ client: client })

    winston.debug(rsmq.redis.server_info.redis_version)

    let queues_to_create = ["messages"]
    rsmq.listQueues(function (err, queues) {
        if (err || !queues) { winston.error(err) }
        else {
            queues.forEach(function(queue){
                queues_to_create.forEach(function(q_to_create){
                    if (queue == q_to_create){
                        winston.info("Not creating queue " + q_to_create)
                        queues_to_create.splice(queues_to_create.indexOf(q_to_create))
                    }
                })
            })

            queues_to_create.forEach(function(queue_to_create){
                rsmq.createQueue({qname: queue_to_create}, function(error, resp){
                    if(resp){winston.info("Created queue " + queue_to_create)}
                })
            })
        }
    })

    export function sendMessage(message: MessageInstance) {
        winston.debug("Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "messages",
            message: JSON.stringify(message)
        }, function (err, resp) {
            if (resp) {
                winston.info("Sent message")
            } else {
                winston.error(err)
            }
        })
    }
}