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

    createMessage: function(body, contact_id, direction, is_reply_to = null){
        console.log("Creating a message:\n" + body + "\n" + contact_id + "\n" +
    direction + "\n" + is_reply_to)

        return db.sequelize.model('Message').create({
            body: body,
            servicechain: 1,//TODO: Make this the ID of a real servicechain,
            contact: contact_id,
            is_reply_to: is_reply_to,
            direction: true, // Make this correct
            message_state: 'MSG_PENDING'
        })
    },

    createNewMessage: function (msg_body, msg_contact_id, msg_direction, msg_servicechain, msg_is_reply_to = null) {
        return Q.fcall(function () {
            return MessageManager.createEmptyMessage()
        })
            .then(function (msg) {
                msg.state = MessageManager.message_states.MSG_PENDING
                msg.body = msg_body
                return msg
            })
            .then(function (msg) {
                return utils.verifyNumberIsInteger(msg_contact_id)
                    .then(function (parsed_cont_id) {
                        return utils.verifyContactExists(parsed_cont_id)
                    })
                    .then(function (cont_id) {
                        msg.contact = cont_id
                        return msg
                    })
            })
            .then(function (msg) {
                // TODO: Validate all of these
                msg.servicechain = msg_servicechain
                msg.direction = msg_direction
                msg.is_reply_to = msg_is_reply_to
                return msg
            })
            .then(function (msg) {
                return MessageManager.insertMessageIntoDatabase(msg)
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

    insertMessageIntoDatabase: function (msg) {
        let deferred = Q.defer()

        let client = new dbClient(user_settings.db_credentials)
        // TODO: Make this into a stored procedure one day
        let prep = client.prepare("INSERT into messages (body, servicechain, contact, is_reply_to, direction, message_state) VALUES (?,?,?,?,?,?)")
        let query = client.query(prep([msg.body, msg.servicechain, msg.contact, msg.is_reply_to, msg.direction, msg.state]), function (err, rows) {
            if (err) {
                deferred.reject(err)
                winston.error(err.message)
            } else {
                deferred.resolve(msg)
            }
        })

        client.end()
        return deferred.promise
    },

    getHundredMessageIds: function (offset = 0) {
        let deferred = Q.defer()

        let client = new dbClient(user_settings.db_credentials);

        let prep = client.prepare("CALL GetOneHundredMessages(?)")
        let query = client.query(prep([offset]), function (err, rows) {
            if (err) {
                deferred.reject(err)
                winston.error(err.message)
            } else {
                deferred.resolve(rows)
            }
        })

        client.end()

        return deferred.promise
    }
}

module.exports = MessageManager