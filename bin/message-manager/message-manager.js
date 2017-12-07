const winston = require('winston')
const bluebird = require('bluebird')
const utils = require('../../utilities')
const user_settings = require('../../user_settings')
const db = require('../../models')

/* TODO: Figure out how to deal with incoming messages - will need to register them...?
Will this be done from the plugin end?
*/

// TODO: MessageManager.message_states potentially redundant
var MessageManager = {
    message_states: Object.freeze(
        {
            MSG_PENDING: 1,
            MSG_SENDING: 2,
            MSG_SENT: 3,
            MSG_DELIVERED_SERVICE: 4,
            MSG_DELIVERED_USER: 5,
            MSG_READ: 6,
            MSG_REPLIED: 7,
            MSG_FAILED: 8
        }
    ),

    /**
     * Attempts to create a new Message in the database with the supplied details.
     * @param {string} body The main message text to add to the message.
     * @param {integer} contact_id The ID number of the contact that this message is sent to/recieved from
     * @param {bool} direction If this is an outbound message, false. If it's inbound, true. TODO: Make sure this is correct!
     * @param {integer} is_reply_to If this is a reply to another message, the id number of the message we're replying to.
     * @returns {Bluebird Promise} Promise resolving to the confirmtion that the new messgae has been entered into the database
     */
    createMessage: function (body, contact_id, direction, is_reply_to = null) {

        return db.sequelize.model('Message').create({
            body: body,
            servicechain: 1,//TODO: Make this the ID of a real servicechain,
            contact: contact_id,
            is_reply_to: is_reply_to,
            direction: true, // Make this correct
            message_state: 'MSG_PENDING'
        })
    },

    /**
     * Does what it says on the tin - attempts to send a message by looping through the services in the servicechain associated with the message.
     * @param {Sequelize Message model} A Message object (TODO: or id?) representing the message to send.
     * @returns {Bluebird Promise} Promise resolving to the sequelize Message model that has been sent.
     */

    sendMessage: function (message) {
        // TODO: Make this work
        /*
        The `message` object has a property, `servicechain`, which holds the ID of the servicechain we should use
        to send this message. We need to retrieve the servicechain from the database and iterate through all of
        plugins until something returns True.

        Promises can help us here - by chaining a series of promises together, we can automatically iterate through
        plugin chains - is the idea!
        */
        return new Promise(function(resolve, reject){
            resolve(message)
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
            limit: 100
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