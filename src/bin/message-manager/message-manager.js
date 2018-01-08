const winston = require('winston')
const Promise = require('bluebird')
const utils = require('../../utilities')
const db = require('../../models')
const servicechainManager = require('../servicechain-manager/servicechain-manager')
const volubleErrors = require('../voluble-errors')
const errors = require('common-errors')

/* TODO: #2 Figure out how to deal with incoming messages - will need to register them...?
Will this be done from the plugin end?
*/

/**
 * The MessageManager is responsible for handling all Message-related operations, including generating new Messages,
 * sending Messages and finding out information about given Messages.
 */
var MessageManager = {
    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {Number} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {Boolean} direction If this is an outbound message, false. If it's inbound, true. TODO: Make sure this is correct!
     * @param {Number} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {promise} Promise resolving to the confirmation that the new message has been entered Numbero the database
     */
    createMessage: function (body, contact_id, direction, is_reply_to = null) {

        return servicechainManager.getServicechainFromContactId(contact_id)
            .then(function (servicechain) {
                return db.sequelize.model('Message').create({
                    body: body,
                    servicechain: servicechain.id,
                    contact: contact_id,
                    is_reply_to: is_reply_to,
                    direction: direction,
                    message_state: 'MSG_PENDING'
                })
            })
    },

    /**
     * Does what it says on the tin - attempts to send a message by finding the service in the messages' servicechain with priority 1.
     * @param {db.Sequelize.Message} msg A Message object (TODO: or id?) representing the message to send.
     * @returns {promise} Promise resolving to the Sequelize message that has been sent.
     */

    sendMessage: function (msg) {
        return Promise.filter(servicechainManager.getServicesInServicechain(msg.servicechain), function (svcInSC) {
            return svcInSC.priority == 1
        })
            .then(function (servicesInSC) {
                if (!servicesInSC || servicesInSC.length < 1) {
                    return Promise.reject(volubleErrors.MessageFailedError("No plugins in servicechain with priority 1"))
                }

                let svcInSC = servicesInSC[0]
                let pluginManager = require('../plugin-manager/plugin-manager')

                return pluginManager.getServiceById(svcInSC.service_id)
                    .then(function (svc) {
                        return MessageManager.sendMessageWithService(msg, svc)
                    })

            })
            .then(function () {
                return msg.reload()
            })
    },

    /**
     * This is called when a messages' state changes. Determine the correct course of action depending on the new message state.
     * @param {Sequelize.Message} msg The message whose state will be updated
     * @param {string} message_state The new message state for the message
     * @param {Sequelize.Plugin} svc The service that initiated the state change.
     */
    updateMessageStateAndContinue: function (msg, message_state, svc) {
        winston.info("Updating message state for message " + msg.id + " to " + message_state)
        msg.message_state = message_state
        return msg.save()
            .then(function (msg) {
                switch (message_state) {
                    case "MSG_FAILED":
                        // To do this, figure out which servicechain we're using, then find out where the plugin that's called the update sits.
                        // If there's one after in the SC, call sendMessageWithService with the next plugin. If not, fail.
                        db.ServicesInSC.findOne({
                            where: {
                                servicechain_id: msg.servicechain,
                                service_id: svc.id
                            }
                        })
                            .then(function (currentSvcInSC) {
                                return db.ServicesInSC.findOne({
                                    where: {
                                        servicechain_id: msg.servicechain,
                                        priority: currentSvcInSC.priority + 1
                                    }
                                })
                            })
                            .then(function (nextSvcInSC) {
                                if (!nextSvcInSC) { return Promise.reject(errors.NotFoundError("Couldn't find another service in servicechain, message " + msg.id + " failed")) }
                                let pluginManager = require('../plugin-manager/plugin-manager')
                                return pluginManager.getServiceById(nextSvcInSC.service_id)
                            })
                            .then(function (nextSvc) {
                                return MessageManager.sendMessageWithService(msg, nextSvc)
                            })
                            .catch(errors.NotFoundError, function(err){
                                winston.info("Message " + msg.id + " failed to send:\n" + err)
                            })
                        break

                    case "MSG_SENT":
                        msg.sent_time = db.Sequelize.fn('NOW')
                        return msg.save()
                }
            })
            .catch(db.Sequelize.ValidationError, function (err) {
                winston.error("Could not update message state:\n" + err)
                return Promise.reject(err)
            })
    },

    /**
     * Sends a given message with the specified plugins' `send_message` method.
     * @param {Sequelize.Message} msg The message to attempt to send
     * @param {Sequelize.Plugin} service The service with which to attempt to send the message
     * @returns {promise} A promise that resolves to whatever the plugin returns
     */
    sendMessageWithService: function (msg, service) {
        winston.debug("Attempting to send message " + msg.id + " with plugin " + service.name)
        MessageManager.updateMessageStateAndContinue(msg, "MSG_SENDING")
            .then(function () {
                let pluginManager = require('../plugin-manager/plugin-manager')
                pluginManager.getPluginById(service.id)
                    .then(function (plugin) {
                        let contactManager = require('../contact-manager/contact-manager')
                        contactManager.getContactWithId(msg.contact)
                            .then(function (contact) {
                                return Promise.try(function () {
                                    plugin.send_message(msg, contact)
                                })
                            })
                    })
                    .catch(volubleErrors.PluginDoesNotExistError, errors.NotFoundError, function (err) {
                        winston.debug("Active plugin with ID " + service.id + " not found")

                        // Check to see if it exists, but is inactive. If so, update the message state and carry on
                        if (!service.initialized) {
                            return MessageManager.updateMessageStateAndContinue(msg, "MSG_FAILED", service)
                        } else {
                            winston.error("Plugin does not appear to exist. Re-throwing...")
                            winston.error(err)
                        }
                    })
            })
    },

    /**
     * Returns the first 100 messages available in the database with a given offset.
     * @param {Number} offset The amount of messages to skip over, before returning the next 100.
     * @returns {promise} A Promise resolving to the rows returned.
     */
    getHundredMessageIds: function (offset) {
        return db.sequelize.model('Message').findAll({
            offset: offset,
            limit: 100,
            order: [['id', 'DESC']]
        })
    },

    /**
     * Returns the details about a message with a given ID.
     * @param {Number} id The ID number of the message to retrieve.
     * @returns {promise} A Promise resolving to a row containing the details of the message.
     */
    getMessageFromId: function (id) {
        return db.sequelize.model('Message').findOne({
            where: { id: id }
        })
    }
}

module.exports = MessageManager