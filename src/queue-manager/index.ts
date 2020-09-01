import * as redis from 'redis';
import * as RedisSMQ from 'rsmq';
import * as winston from 'winston';

import { Message } from '../models/message';


const logger = winston.loggers.get(process.title).child({ module: 'QueueMgr' })

export interface MessageReceivedRequest {
    request_data: Record<string, unknown> | string,
    service_id: string
}

const queue_list = ["message-send", "message-state-update", "message-sent-time-update", "message-sent-service-update", "message-recv"]
let client: redis.RedisClient;
if (process.env.REDISTOGO_URL) {
    const rtg = require("url").parse(process.env.REDISTOGO_URL);
    client = redis.createClient(rtg.port, rtg.hostname)
    client.auth(rtg.auth.split(":")[1]);
} else {
    client = redis.createClient()//{ host: "127.0.0.1" })
}

const rsmq: RedisSMQ = new RedisSMQ({ client })

export class QueueManager {
    public static addMessageToSendRequest(message: Message): void {
        logger.debug("Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "message-send",
            message: message.id
        }, function (err, resp) {
            if (resp) {
                logger.info("Added send request for message " + message.id)
            } else {
                logger.error(err)
                throw err
            }
        })
    }

    public static addMessageStateUpdateRequest(message_id: string, message_state: string): void {
        const q_msg = { message_id: message_id, status: message_state }
        rsmq.sendMessage({
            qname: "message-state-update",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                logger.info("Added state update request for message " + message_id)
            } else {
                logger.error(err)
                throw err
            }
        })
    }

    public static addMessageSentTimeUpdateRequest(message_id: string, message_unix_timestamp_ms: number): void {
        const q_msg = { message_id: message_id, timestamp: message_unix_timestamp_ms }
        rsmq.sendMessage({
            qname: "message-sent-time-update", message: JSON.stringify(q_msg)
        }, (err, resp) => {
            if (resp) { logger.info("Added message sent time update request for message " + message_id) }
            else { logger.error(err); throw err }
        })
    }

    public static addMessageSentServiceUpdateRequest(message_id: string, message_sent_service_id: string): void {
        const q_msg = { message_id: message_id, sent_service: message_sent_service_id }
        rsmq.sendMessage({
            qname: "message-sent-service-update", message: JSON.stringify(q_msg)
        }, (err, resp) => {
            if (resp) { logger.info("Added message sent service update for message " + message_id) }
            else { logger.error(err); throw err }
        })
    }

    public static async addMessageReceivedRequest(request_data: Record<string, unknown> | string, service_id: string): Promise<string> {
        const q_msg: MessageReceivedRequest = { request_data: request_data, service_id: service_id }
        logger.debug(`Sending queue message`)
        return rsmq.sendMessageAsync({ qname: 'message-recv', message: JSON.stringify(q_msg) })
            .catch(e => {
                logger.error(e)
                throw e
            })
    }

    public static createQueues(): Promise<void> {
        logger.debug("Loading queue manager")
        return rsmq.listQueuesAsync()
            .then((queues) => {
                return queue_list.filter((required_q) => {
                    return !queues.includes(required_q)
                })
            })
            .then(queues_to_create => {
                if (!queues_to_create) { logger.info('All queues already created'); return }
                return Promise.all(queues_to_create.map((queue_to_create) => {
                    return rsmq.createQueueAsync({ qname: queue_to_create })
                        .catch(e => { return e })
                }))
            })
            .then((vals) => {
                vals.forEach(val => {
                    if (val instanceof Error) { throw val }
                });
            })
    }

    public static shutdownQueues(): void {
        rsmq.quit()
        client.end(process.env.NODE_ENV != "production")
    }

}