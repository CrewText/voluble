const winston = require('winston')
const Q = require('Q')
const message = require('../messages/message')
const utils = require('../../utilities')

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
        var m = Q.fcall(function () {
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
                return msg
            })

        return m
    },

    sendMessage: function (message) {
        // TODO: Make this work
    }

}

module.exports = MessageManager