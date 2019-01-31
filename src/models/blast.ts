import * as Sequelize from "sequelize"
import { MessageInstance } from './message'
import { Message as MessageAttributes, Blast as BlastAttributes } from 'voluble-common'

export interface BlastInstance extends Sequelize.Instance<BlastAttributes>, BlastAttributes {
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