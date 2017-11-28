const winston = require('winston')
const Q = require('Q')
const dbClient = require('mariasql');
const message = require('../messages/message')
const utils = require('../../utilities')
const user_settings = require('../../user_settings')

var MessageManager = {
    message_states: Object.freeze(
        {
            MESSAGE_FAILED: -1,
            MESSAGE_UNSENT: 0,
            MESSAGE_SENT: 1,
            MESSAGE_DELIVERED_SERVICE: 2,
            MESSAGE_DELIVERED_USER: 3,
            MESSAGE_READ: 4,
            MESSAGE_REPLIED: 5
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

    createNewMessage: function (msg_body, msg_contact_id, msg_direction, msg_servicechain, msg_is_reply_to = null) {
        return Q.fcall(function () {
            return MessageManager.createEmptyMessage()
        })
            .then(function (msg) {
                msg.state = MessageManager.message_states.MESSAGE_UNSENT
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
                // TODO: Register message in the database
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
        let prep = client.prepare("INSERT into messages VALUES (null,?,?,?,?,?,?)")
        let query = client.query(prep([msg.body, msg.servicechain, msg.contact, msg.is_reply_to, msg.direction, msg.state]), function (err, rows) {
            if (err) {
                deferred.reject(err)
                winston.error(err.message)
            } else {
                err.resolve(msg)
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