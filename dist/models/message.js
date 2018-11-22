"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(sequelize, DataTypes) {
    var Message = sequelize.define('Message', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        body: DataTypes.STRING(1024),
        contact: DataTypes.BIGINT,
        is_reply_to: DataTypes.BIGINT,
        direction: DataTypes.ENUM('INBOUND', 'OUTBOUND'),
        sent_time: DataTypes.DATE,
        message_state: DataTypes.ENUM('MSG_PENDING', 'MSG_SENDING', 'MSG_SENT', 'MSG_DELIVERED_SERVICE', 'MSG_DELIVERED_USER', 'MSG_READ', 'MSG_REPLIED', 'MSG_FAILED', 'MSG_ARRIVED')
    });
    return Message;
}
exports.default = default_1;
