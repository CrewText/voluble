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

var MessageManager = {
    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {integer} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {bool} direction If this is an outbound message, false. If it's inbound, true. TODO: Make sure this is correct!
     * @param {integer} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {Bluebird Promise} Promise resolving to the confirmtion that the new messgae has been entered into the database
     */
    createMessage: function (body, contact_id, direction, is_reply_to = null) {

        return servicechainManager.getServicechainFromContactId(contact_id)
            .then(function (servicechain) {
                return db.sequelize.model('Message').create({
                    body: body,
                    servicechain: servicechain.id,
                    contact: contact_id,
                    is_reply_to: is_reply_to,
                    direction: direction, // Make this correct - is
                    message_state: 'MSG_PENDING'
                })
            })
    },

    /**
     * Does what it says on the tin - attempts to send a message by looping through the services in the servicechain associated with the message.
     * @param {Sequelize Message model} A Message object (TODO: or id?) representing the message to send.
     * @returns {Bluebird Promise} Promise reso lving to the sequelize Message model that has been sent.
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
                                if (!nextSvcInSC) { return Promise.reject(errors.NotFoundError("Couldn't find another service in the servicechain, message failed")) }
                                let pluginManager = require('../plugin-manager/plugin-manager')
                                return pluginManager.getServiceById(nextSvcInSC.service_id)
                            })
                            .then(function (nextSvc) {
                                return MessageManager.sendMessageWithService(msg, nextSvc)
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

    sendMessageWithService: function (msg, service) {
        winston.debug("Attempting to send message " + msg.id + " with plugin " + service.name)
        MessageManager.updateMessageStateAndContinue(msg, "MSG_SENDING")
            .then(function () {
                let pluginManager = require('../plugin-manager/plugin-manager')
                pluginManager.getPluginById(service.id)
                    .then(function (plugin) {
                        return Promise.try(function () { plugin.send_message(msg) })
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
     * @param {integer} offset The amount of messages to skip over, before returning the next 100.
     * @returns {Bluebird Promise} A Promise resolving to the rows returned.
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
     * @param {integer} id The ID number of the message to retrieve.
     * @returns {Bluebird Promise} A Promise resolving to a row containing the details of the message.
     */
    getMessageFromId: function (id) {
        return db.sequelize.model('Message').findOne({
            where: { id: id }
        })
    }
}

module.exports = MessageManager