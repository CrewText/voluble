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
//import * as kue from 'kue'
import * as redis from 'redis'
import * as db from '../models'
import { MessageManager } from '../message-manager'
import { QueueManager } from '../queue-manager'


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
let worker_msg_recv = new rsmqWorker("message-send", { redis: client})
let rsmq_client = new rsmq({ client: client })

// rsmq_client.receiveMessage({ qname: "message-send" }, function (err, resp) {
//     if (resp && resp.id) {
//         winston.info("Main: got message with job ID " + resp.id)
//         let parsed_msg: db.MessageInstance = JSON.parse(resp.message)
//         winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
//         let body = { message_id: parsed_msg.id, status: "MSG_SENDING" }

//     //      rsmq_client.sendMessage({qname: 'message-state-update', message: JSON.stringify(body)}, function () {
//     //      MessageManager.doMessageSend(parsed_msg).then(function () {
//     //          rsmq_client.deleteMessage({id:resp.id, qname:'message-send'}, function(success){

//     //          })
//     //      })
//     //  })
//     }
// })
worker_msg_recv.on("message", function (message, next, message_id) {
    let parsed_msg: db.MessageInstance = JSON.parse(message)
    winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
    // let body = { message_id: parsed_msg.id, status: "MSG_SENDING" }

    //  rsmq_client.sendMessage({qname: 'message-state-update', message: JSON.stringify(body)}, function () {
    //      MessageManager.doMessageSend(parsed_msg).then(function () {
    //          next()
    //      })
     //})
     winston.debug(`Main: Attempting to message state for message ${parsed_msg.id} to MSG_SENDING`)
     QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING")
     winston.debug(`Main: Attempting message send for message ${parsed_msg.id}`)
     MessageManager.doMessageSend(parsed_msg).finally(function(){
         next()
     })
}).start()

//client.on('ready', function () {

// let queue = kue.createQueue({ redis: process.env.REDISTOGO_URL || "redis://192.168.56.104" })
// queue.active(function(ids:string[], err:any){
//     console.log("Worker: Active jobs: " + ids.length)
// })
// queue.inactive(function(ids:string[], err:any){
//     console.log("Worker: Inactive jobs: " + ids.length)
// })

// queue.on('ready',function(){
//     winston.debug("Main: Redis client ready")
//     queue.process('message-send', function (job, done) {
//         winston.debug("Main: worker has received message")
//         let parsed_msg: db.MessageInstance = JSON.parse(job.data)
//         winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)
//     })
// })

// queue.process('message-send', function (job, done) {
//     winston.debug("Main: worker has received message")
//     let parsed_msg: db.MessageInstance = JSON.parse(job.data)
//     winston.debug(`Main: Worker has collected message ${parsed_msg.id} for sending`)

// QueueManager.addMessageStateUpdateRequest(parsed_msg.id, "MSG_SENDING")
// MessageManager.doMessageSend(parsed_msg).then(function () {
//     done()
// })
//})

//})


client.on('error', function () {
    winston.error("Main: Failed to connect to the redis server!")
})
