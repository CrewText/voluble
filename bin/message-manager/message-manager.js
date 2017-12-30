const winston = require('winston')
const Promise = require('bluebird')
const utils = require('../../utilities')
const user_settings = require('../../user_settings')
const db = require('../../models')
const servicechainManager = require('../servicechain-manager/servicechain-manager')
const pluginManager = require("../plugin-manager/plugin-manager")
const volubleErrors = require('../voluble-errors')

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

    sendMessage: function (message) {
        /*
        The `message` object has a property, `servicechain`, which holds the ID of the servicechain we should use
        to send this message. We need to retrieve the servicechain from the database and iterate through all of
        plugins until something returns True.

        Promises can help us here - by chaining a series of promises together, we can automatically iterate through
        plugin chains - is the idea!
        */

        // Step 1 - get the list of services we're going to send the message by
        return servicechainManager.getServicesInServicechain(message.servicechain)
            .then(function (rows) {
                // We've got the array of full rows, but we just want the service ids
                return Promise.map(rows, function (row) {
                    return row.service_id
                })
            })
            .then(function (service_ids) {
                // Now we have a row of service ids, so for each id:
                return Promise.mapSeries(service_ids, function (service_id) {
                    // Make sure that the message has not been sent:
                    return message.reload()
                        .then(function (msg) {
                            if (msg.message_state == "MSG_PENDING" ||
                                msg.message_state == "MSG_FAILED") {
                                return msg
                            } else {
                                throw new volubleErrors.MessageAlreadySentError("Message " + msg.id + " has already been sent. Not sending.")
                            }
                        })
                        // We know that the message has not been sent, so try and send it.
                        .then(function (msg) {
                            // Get the plugin associated with a given service ID.
                            return Promise.try(function(){
                                return pluginManager.getPluginById(service_id)
                            })
                                .then(function (plugin) {
                                    // Now that we have the plugin, use it to send the message.
                                    return Promise.try(function () {
                                        winston.info("Attempting to send message " + msg.id + " with plugin " + plugin.name)
                                        return plugin.send_message(msg)
                                    })
                                        .then(function () {
                                            msg.message_state = "MSG_SENDING"
                                            msg.sent_time = db.sequelize.fn('NOW')
                                            return msg.save({ fields: ['message_state', 'sent_time'] })
                                        })
                                        .catch(function (err) {
                                            /* Something went wrong with the message-sending.
                                            Mark the message as failed and re-throw.
                                            */
                                            winston.error(err)
                                            msg.message_state = "MSG_FAILED"
                                            throw err
                                        })
                                })
                        })// TODO: Find a way of mapSeries iterating when we have completed the message-sending.
                        .catch(volubleErrors.MessageAlreadySentError, function (e) {
                            winston.info("Message " + message.id + " has already been sent. Not trying again.")
                        })
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