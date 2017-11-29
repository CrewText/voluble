let message_model = function (sequelize, DataTypes) {
    var Message = sequelize.define('Message', {

        message_body: DataTypes.STRING(1024),
        servicechain: DataTypes.INTEGER,
        contact: DataTypes.BIGINT,
        is_reply_to: DataTypes.BIGINT,
        direction: DataTypes.BOOLEAN,
        message_state: DataTypes.ENUM('MSG_PENDING',
            'MSG_SENDING',
            'MSG_SENT',
            'MSG_DELIVERED_SERVICE',
            'MSG_DELIVERED_USER',
            'MSG_READ',
            'MSG_REPLIED',
            'MSG_FAILED')

    })

    return Message
}

module.exports = message_model