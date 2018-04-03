const winston = require('winston')
import * as rsmqWorker from 'rsmq-worker'

winston.info("Initializing worker process")

let worker = new rsmqWorker("msg")

worker.on("message", function(message, next, id){
    let parsed_msg = JSON.parse(message)
    winston.info(`Got message: ${parsed_msg.body}`)
    next()
})