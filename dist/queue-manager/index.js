"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const message_manager_1 = require("../message-manager");
const winston = require('winston');
const RedisSMQ = require("rsmq");
const redis = require("redis");
const rsmqWorker = require("rsmq-worker");
const errs = require('common-errors');
var QueueManager;
(function (QueueManager) {
    let client;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname);
        client.auth(rtg.auth.split(":")[1]);
    }
    else {
        client = redis.createClient();
    }
    let rsmq = new RedisSMQ({ client: client });
    if (rsmq.redis.server_info.redis_version) {
        winston.info("QM: Connected to redis server");
    }
    else {
        winston.error("QM: Failed to connect to redis server");
    }
    function init_queues() {
        createQueues();
        let worker_send_msg_update = new rsmqWorker("message-state-update", { redis: client });
        worker_send_msg_update.on("message", function (message, next, message_id) {
            let update = JSON.parse(message);
            winston.debug("QM: Got message update for message " + update.message_id + ": " + update.status);
            message_manager_1.MessageManager.updateMessageState(update.message_id, update.status)
                .catch(errs.NotFoundError, function (error) {
                winston.info("QM: Dropping message update request for message with ID " + update.message_id);
            })
                .then(function () { next(); });
        });
        worker_send_msg_update.start();
    }
    QueueManager.init_queues = init_queues;
    function addMessageToSendRequest(message) {
        winston.debug("QM: Sending message with ID " + message.id);
        rsmq.sendMessage({
            qname: "message-send",
            message: JSON.stringify(message)
        }, function (err, resp) {
            if (resp) {
                winston.info("QM: Added send request for message " + message.id);
                return true;
            }
            else {
                winston.error(err);
                throw err;
            }
        });
    }
    QueueManager.addMessageToSendRequest = addMessageToSendRequest;
    function addMessageStateUpdateRequest(message_id, message_state) {
        let q_msg = { message_id: message_id, status: message_state };
        rsmq.sendMessage({
            qname: "message-state-update",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                return true;
            }
            else {
                winston.error(err);
                throw err;
            }
        });
    }
    QueueManager.addMessageStateUpdateRequest = addMessageStateUpdateRequest;
    function addMessageReceivedRequest(request_data, service_id) {
        let q_msg = { request_data: request_data, service_id: service_id };
        winston.debug(`Sending queue message`);
        rsmq.sendMessage({
            qname: "message-recv",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                return true;
            }
            else {
                winston.error(err);
                throw err;
            }
        });
    }
    QueueManager.addMessageReceivedRequest = addMessageReceivedRequest;
    function createQueues() {
        let total_queue_list = ["message-send", "message-state-update", "message-recv"];
        let queues_to_create = [];
        rsmq.listQueues(function (err, queues_in_redis) {
            if (err || !queues_in_redis) {
                winston.error(err);
            }
            else {
                queues_in_redis.forEach(function (queue_in_redis) {
                    total_queue_list.forEach(function (q_to_create) {
                        if (queue_in_redis == q_to_create) {
                            winston.info("Not creating queue " + q_to_create);
                        }
                        else {
                            queues_to_create.push(q_to_create);
                        }
                    });
                });
                queues_to_create.forEach(function (queue_to_create) {
                    rsmq.createQueue({ qname: queue_to_create }, function (error, resp) {
                        if (resp) {
                            winston.info("Created queue " + queue_to_create);
                        }
                    });
                });
            }
        });
    }
})(QueueManager = exports.QueueManager || (exports.QueueManager = {}));
