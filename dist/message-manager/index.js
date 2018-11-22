"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require('winston');
const Promise = require("bluebird");
const db = require("../models");
const volubleErrors = require("../voluble-errors");
const servicechain_manager_1 = require("../servicechain-manager");
const plugin_manager_1 = require("../plugin-manager");
const contact_manager_1 = require("../contact-manager");
const queue_manager_1 = require("../queue-manager");
const errs = require('common-errors');
var MessageManager;
(function (MessageManager) {
    let MessageStates;
    (function (MessageStates) {
        MessageStates["MSG_PENDING"] = "MSG_PENDING";
        MessageStates["MSG_SENDING"] = "MSG_SENDING";
        MessageStates["MSG_SENT"] = "MSG_SENT";
        MessageStates["MSG_DELIVERED_SERVICE"] = "MSG_DELIVERED_SERVICE";
        MessageStates["MSG_DELIVERED_USER"] = "MSG_DELIVERED_USER";
        MessageStates["MSG_READ"] = "MSG_READ";
        MessageStates["MSG_REPLIED"] = "MSG_REPLIED";
        MessageStates["MSG_FAILED"] = "MSG_FAILED";
        MessageStates["MSG_ARRIVED"] = "MSG_ARRIVED";
    })(MessageStates = MessageManager.MessageStates || (MessageManager.MessageStates = {}));
    function createMessage(body, contact_id, direction, is_reply_to = null, servicechain_id = null, message_state) {
        return contact_manager_1.ContactManager.checkContactWithIDExists(contact_id)
            .catch(errs.NotFoundError, function (NFError) {
            winston.error(NFError);
            return Promise.reject(new volubleErrors.MessageFailedError(NFError));
        })
            .then(function (verified_contact_id) {
            if (servicechain_id) {
                return servicechain_manager_1.ServicechainManager.getServicechainById(servicechain_id);
            }
            else {
                winston.debug(`MM: Finding default servicechain for contact ${verified_contact_id}`);
                return servicechain_manager_1.ServicechainManager.getServicechainFromContactId(verified_contact_id);
            }
        })
            .then(function (servicechain) {
            let msg_state = message_state ? message_state : MessageStates.MSG_PENDING;
            console.log(`Message_state: ${msg_state}`);
            if (servicechain) {
                let msg = db.models.Message.build({
                    body: body,
                    ServicechainId: servicechain.id,
                    contact: contact_id,
                    is_reply_to: is_reply_to,
                    direction: direction,
                    message_state: msg_state
                });
                return msg.save();
            }
            else {
                return Promise.reject(new errs.NotFoundError(`Could not find servicechain for contact ${contact_id}`));
            }
        });
    }
    MessageManager.createMessage = createMessage;
    function sendMessage(msg) {
        Promise.try(function () {
            return queue_manager_1.QueueManager.addMessageToSendRequest(msg);
        })
            .catch(function () {
            return queue_manager_1.QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED");
        });
        return msg;
    }
    MessageManager.sendMessage = sendMessage;
    function doMessageSend(msg) {
        return servicechain_manager_1.ServicechainManager.getServiceCountInServicechain(msg.ServicechainId).then(function (svc_count) {
            let continue_trying = true;
            winston.debug(`MM: Beginning message send attempt loop for message ${msg.id}; ${svc_count} plugins in servicechain ${msg.ServicechainId}`);
            let svc_prorities = [];
            let i = 1;
            while (i != svc_count + 1) {
                svc_prorities.push(i);
                i++;
            }
            return Promise.mapSeries(svc_prorities, function (svc_priority) {
                if (continue_trying) {
                    winston.debug(`MM: Attempting to find plugin with priority ${svc_priority} in servicechain ${msg.ServicechainId}`);
                    return servicechain_manager_1.ServicechainManager.getServiceInServicechainByPriority(msg.ServicechainId, svc_priority)
                        .then(function (svc) {
                        if (svc) {
                            winston.debug(`MM: Servicechain ${msg.ServicechainId} priority ${svc_priority}: ${svc.directory_name}. Attempting message ${msg.id} send...`);
                            return sendMessageWithService(msg, svc);
                        }
                        else {
                            return false;
                        }
                    })
                        .then(function (message_sent) {
                        if (message_sent) {
                            continue_trying = false;
                            return true;
                        }
                        else {
                            winston.debug(`MM: Failed to send message ${msg.id}, trying next priority plugin...`);
                            return false;
                        }
                    })
                        .catch(servicechain_manager_1.ServicechainManager.EmptyServicechainError, function (error) {
                        errs.log(error, error.message);
                        continue_trying = false;
                        queue_manager_1.QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED");
                        return false;
                    });
                }
                else {
                    winston.info(`MM: Not trying with prio ${svc_priority}`);
                    return false;
                }
            });
        })
            .catch(errs.NotFoundError, function (error) {
            errs.log(error.message, error);
            return false;
        })
            .catch(Promise.TimeoutError, function (error) {
            errs.log(error.message, error);
            return false;
        })
            .reduce(function (total, item) {
            if (total) {
                return total;
            }
            else {
                return item;
            }
        }, false)
            .then(function (message_sent_success) {
            if (message_sent_success) {
                queue_manager_1.QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_SENT");
                return Promise.resolve(msg);
            }
            else {
                winston.info(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`);
                queue_manager_1.QueueManager.addMessageStateUpdateRequest(msg.id, "MSG_FAILED");
                return Promise.reject(`Ran out of services for servicechain ${msg.ServicechainId}, message failed`);
            }
        });
    }
    MessageManager.doMessageSend = doMessageSend;
    function sendMessageWithService(msg, svc) {
        return plugin_manager_1.PluginManager.getPluginById(svc.id)
            .then(function (plugin) {
            if (plugin) {
                winston.debug(`MM: Loaded plugin ${plugin.name}`);
                return contact_manager_1.ContactManager.getContactWithId(msg.contact)
                    .then(function (contact) {
                    if (contact) {
                        winston.debug(`MM: Found contact ${contact.id}, calling 'send_message() on plugin ${plugin.name} for message ${msg.id}...`);
                        return Promise.try(function () {
                            let message_sent_success = plugin.send_message(msg, contact);
                            return message_sent_success;
                        }).timeout(30000, `Message ${msg.id} could not be sent within 30 seconds, timing out...`);
                    }
                    else {
                        return Promise.reject(new errs.NotFoundError(`Could not find contact with ID ${msg.contact}`));
                    }
                });
            }
            else {
                return Promise.reject(new errs.NotFoundError(`Could not find plugin with ID ${svc.id}`));
            }
        }).catch(plugin_manager_1.PluginManager.PluginImportFailedError, function (error) {
            errs.log(error.message, error);
            return Promise.reject(error);
        });
    }
    function updateMessageState(msg_id, msg_state) {
        winston.info("MM: Updating message state");
        return getMessageFromId(msg_id)
            .then(function (msg) {
            if (msg) {
                msg.message_state = msg_state;
                return msg.save();
            }
            else {
                winston.info(`MM: Could not find message with ID ${msg_id}`);
                return Promise.reject(new errs.NotFoundError(`Message with ID ${msg_id} was not found`));
            }
        });
    }
    MessageManager.updateMessageState = updateMessageState;
    function getHundredMessageIds(offset) {
        return db.models.Message.findAll({
            offset: offset,
            limit: 100,
            order: [['id', 'DESC']]
        });
    }
    MessageManager.getHundredMessageIds = getHundredMessageIds;
    function getMessageFromId(id) {
        return db.models.Message.findById(id);
    }
    MessageManager.getMessageFromId = getMessageFromId;
})(MessageManager = exports.MessageManager || (exports.MessageManager = {}));
