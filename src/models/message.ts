import * as Sequelize from "sequelize"

export interface MessageAttributes {
    body: string
    ServicechainId: string,
    contact: string
    is_reply_to: string | null | undefined
    direction: string,
    sent_time?: Date,
    message_state: string
}

export interface MessageInstance extends Sequelize.Instance<MessageAttributes> {
    id: string,
    createdAt: Date,
    updatedAt: Date,

    body: string
    ServicechainId: string,
    contact: string
    is_reply_to: string | null | undefined
    direction: string,
    sent_time: Date,
    message_state: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Message = sequelize.define('Message', {

        id: {
            type: DataTypes.UUIDV4,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        body: DataTypes.STRING(1024),
        contact: DataTypes.BIGINT,
        is_reply_to: DataTypes.BIGINT,
        direction: DataTypes.ENUM('INBOUND', 'OUTBOUND'),
        sent_time: DataTypes.DATE,
        message_state: DataTypes.ENUM('MSG_PENDING',
            'MSG_SENDING',
            'MSG_SENT',
            'MSG_DELIVERED_SERVICE',
            'MSG_DELIVERED_USER',
            'MSG_READ',
            'MSG_REPLIED',
            'MSG_FAILED',
            'MSG_ARRIVED')
    })

    return Message
}