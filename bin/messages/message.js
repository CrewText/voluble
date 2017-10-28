var message_states = Object.freeze(
  {
    MESSAGE_FAILED: -1,
    MESSAGE_SENT: 1,
    MESSAGE_DELIVERED_SERVICE: 2,
    MESSAGE_DELIVERED_USER: 3,
    MESSAGE_READ: 4,
    MESSAGE_REPLIED: 5
  }
)

var Message = {
  id: null,
  body: null,
  servicechain: null,
  state: null,
  contact: null
}

var createNewMessage = function () {
  /* TODO: Should createNewMessage return a ready-to-go message with a new DB message ID?
   Should it register in the DB? */
  let m = Object.create(Message)
  return m
}

exports.message_states = message_states
exports.Message = Message
exports.createNewMessage = createNewMessage