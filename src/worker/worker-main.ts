const winston = require('winston')
import * as rsmqWorker from 'rsmq-worker'
import * as redis from 'redis'

winston.info("Worker: Initializing worker process")

let client;
    if (process.env.REDISTOGO_URL){
        let rtg   = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient({host:"192.168.56.104"})
    }
let worker = new rsmqWorker("messages", { redis: client })

worker.on("message", function (message, next, message_id) {
    let parsed_msg = JSON.parse(message)
    winston.info(`Got message: ${parsed_msg.body}`)
    next()
})

worker.start()
