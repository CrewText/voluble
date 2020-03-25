import { HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, DataTypes, Sequelize } from "sequelize"
import { Blast as BlastAttributes } from 'voluble-common'
import { Message } from './message'

export class Blast extends Model implements BlastAttributes {
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public id!: string
    public name!: string

    public getMessages!: HasManyGetAssociationsMixin<Message>
    public setMessages!: HasManySetAssociationsMixin<Message, Message['id']>
    public addMessage!: HasManyAddAssociationMixin<Message, Message['id']>
    public addMessages!: HasManyAddAssociationsMixin<Message, Message['id']>
    public createMessage!: HasManyCreateAssociationMixin<Message>
    public countMessages!: HasManyCountAssociationsMixin
    public hasMessage!: HasManyHasAssociationMixin<Message, Message['id']>
    public hasMessages!: HasManyHasAssociationsMixin<Message, Message['id']>
    public removeMessage!: HasManyRemoveAssociationMixin<Message, Message['id']>
    public removeMessages!: HasManyRemoveAssociationsMixin<Message, Message['id']>

    public static initModel(sequelize: Sequelize) {
        return this.init({
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: DataTypes.STRING
        },
            {
                sequelize: sequelize,
                tableName: "blasts"
            })
    }
}