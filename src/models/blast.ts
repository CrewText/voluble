import * as Sequelize from "sequelize"
import { MessageInstance, MessageAttributes } from './message'

export interface BlastAttributes {
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
    name: string
}

export interface BlastInstance extends Sequelize.Instance<BlastAttributes>, BlastAttributes {
    // id: string,
    // createdAt: Date,
    // updatedAt: Date,

    // name: string

    getMessages: Sequelize.HasManyGetAssociationsMixin<MessageInstance>
    setMessages: Sequelize.HasManySetAssociationsMixin<MessageInstance, MessageInstance['id']>,
    addMessage: Sequelize.HasManyAddAssociationMixin<MessageInstance, MessageInstance['id']>,
    addMessages: Sequelize.HasManyAddAssociationsMixin<MessageInstance, MessageInstance['id']>,
    createMessage: Sequelize.HasManyCreateAssociationMixin<MessageAttributes, MessageInstance>,
    countMessages: Sequelize.HasManyCountAssociationsMixin
    hasMessage: Sequelize.HasManyHasAssociationMixin<MessageInstance, MessageInstance['id']>,
    hasMessages: Sequelize.HasManyHasAssociationsMixin<MessageInstance, MessageInstance['id']>,
    removeMessage: Sequelize.HasManyRemoveAssociationMixin<MessageAttributes, MessageInstance['id']>,
    removeMessages: Sequelize.HasManyRemoveAssociationsMixin<MessageInstance, MessageInstance['id']>
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Blast = sequelize.define('Blast', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING
    })

    return Blast
}