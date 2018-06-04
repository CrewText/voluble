const winston = require('winston')
if (!process.env.IS_PRODUCTION) {
    winston.info("Detected dev environment")
    winston.level = 'debug'
} else {
    winston.info("Detected prod environment")
    winston.level = 'info'
}

import * as rsmqWorker from 'rsmq-worker'
import * as redis from 'redis'

namespace MessageSendWorker {
    winston.info("Worker: Initializing worker process")

    function createRedisClient() {
        let client;
        if (process.env.REDISTOGO_URL) {
            let rtg = require("url").parse(process.env.REDISTOGO_URL);
            client = redis.createClient(rtg.port, rtg.hostname)
            client.auth(rtg.auth.split(":")[1]);
        } else {
            client = redis.createClient({ host: "192.168.56.104" })
        }
        return client
    }

    let client = createRedisClient()
    client.on('ready', function () {
        let worker_msg_recv = new rsmqWorker("message-send", { redis: client })
        let worker_send_msg_update = new rsmqWorker("message-state-update", { redis: client })

        worker_msg_recv.on("message", function (message, next, message_id) {
            let parsed_msg = JSON.parse(message)
            winston.info(`Got message: ${parsed_msg.body}`)
            let body = { message_id: parsed_msg.id, status: "MSG_SENDING" }
            worker_send_msg_update.send(JSON.stringify(body))
            next()
        })

        if (worker_msg_recv.start()) {
            winston.info("Inited message-receive worker")
        } else {
            winston.error("Failed to init message-receive worker")

        }
    })

    client.on('error', function () {
        winston.error("Failed to connect to the redis server!")
    })
}