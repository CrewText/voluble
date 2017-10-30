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
    })

}

MessageManager.createEmptyMessage = function () {
    let m = Object.create(message.Message)
    return m
}

MessageManager.createNewMessage = function (msg_body, msg_contact_id, msg_direction, msg_servicechain, msg_is_reply_to = null) {
    /* TODO: Should createNewMessage return a ready-to-go message with a new DB message ID?
 Should it register in the DB? --> Yes */
    let m = this.createEmptyMessage()
    m.state = this.message_states.MESSAGE_UNSENT
    m.body = msg_body

    utils.verifyNumberIsInteger(msg_contact_id)
        .then(function (parsed_contact_id) {
            return utils.verifyContactExists(parsed_contact_id)
        })
        .then(function () {
            // TODO: Make this resolve to an actual contact object?
            m.contact = msg_contact_id
        })
        .then(function () {
            // TODO: Validate all of these
            m.servicechain = msg_servicechain,
                m.direction = msg_direction,
                m.is_reply_to = msg_is_reply_to
        })
        .then(function () {
            // TODO: Register message in the database
        })
        .done()

    return m
}

module.exports = MessageManager