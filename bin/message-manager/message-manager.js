const winston = require('winston')
const Q = require('Q')
const bluebird = require('bluebird')
const message = require('../messages/message')
const utils = require('../../utilities')
const user_settings = require('../../user_settings')
const db = require('../../models')

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

    message_directions: Object.freeze({
        DIRECTION_INBOUND: 0,
        DIRECTION_OUTBOUND: 1
    }),

    createEmptyMessage: function () {
        let m = Object.create(message.Message)
        return m
    },

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

    sendMessage: function (message) {
        // TODO: Make this work
        /*
        The `message` object has a property, `servicechain`, which holds the ID of the servicechain we should use
        to send this message. We need to retrieve the servicechain from the database and iterate through all of
        plugins until something returns True.

        Promises can help us here - by chaining a series of promises together, we can automatically iterate through
        plugin chains - is the idea!
        */


    },

    getHundredMessageIds: function (offset = 0) {
        return db.sequelize.model('Message').findAll({
            offset: offset,
            limit: 100
        })
    },

    getMessageFromId: function (id) {
        return db.sequelize.model('Message').findOne({
            where: { id: id }
        })
    }
}

module.exports = MessageManager