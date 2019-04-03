import * as Sequelize from "sequelize"
import { ContactInstance } from "./contact";
import { Message as MessageAttributes, Contact as ContactAttributes, MessageStates, MessageDirections } from 'voluble-common'

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

    getContact: Sequelize.BelongsToGetAssociationMixin<ContactInstance>,
    setContact: Sequelize.BelongsToSetAssociationMixin<ContactInstance, ContactInstance['id']>,
    createContact: Sequelize.BelongsToCreateAssociationMixin<ContactAttributes, ContactInstance>,
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Message = sequelize.define('Message', {

        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        body: DataTypes.STRING(1024),
        contact: DataTypes.UUID,
        is_reply_to: DataTypes.UUID,
        direction: DataTypes.ENUM(Object.keys(MessageDirections)),
        sent_time: DataTypes.DATE,
        message_state: DataTypes.ENUM(Object.keys(MessageStates))
    })
    return Message
}