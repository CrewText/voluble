import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, DataTypes, fn,Model, Sequelize } from 'sequelize'
import { Message as MessageAttributes, MessageDirections, MessageStates } from 'voluble-common'

import { Category } from './category'
import { Contact } from './contact'
import { Servicechain } from './servicechain'
import { User } from './user'

export class Message extends Model implements MessageAttributes {
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public id!: string

    public body!: string
    public servicechain: string
    public contact!: string
    public direction!: MessageDirections
    public message_state!: MessageStates
    public sent_time!: Date
    public sent_service: string
    public cost!: number

    public getContact!: BelongsToGetAssociationMixin<Contact>
    public setContact!: BelongsToSetAssociationMixin<Contact, Contact['id']>
    public createContact!: BelongsToCreateAssociationMixin<Contact>

    public getCategory!: BelongsToGetAssociationMixin<Category>
    public setCategory!: BelongsToSetAssociationMixin<Category, Category['id']>
    public createCategory!: BelongsToCreateAssociationMixin<Category>

    public getUser!: BelongsToGetAssociationMixin<User>
    public setUser!: BelongsToSetAssociationMixin<User, User['id']>
    public createUser!: BelongsToCreateAssociationMixin<User>

    public getServicechain!: BelongsToGetAssociationMixin<Servicechain>
    public setServicechain!: BelongsToSetAssociationMixin<Servicechain, Servicechain['id']>
    public createServicechain!: BelongsToCreateAssociationMixin<Servicechain>

    public static initModel(sequelize: Sequelize) {
        return this.init({

            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },
            body: DataTypes.STRING(1024),
            contact: DataTypes.UUID,
            is_reply_to: DataTypes.UUID,
            user: DataTypes.STRING,
            direction: DataTypes.ENUM(...Object.keys(MessageDirections)),
            sent_time: { type: DataTypes.DATE, allowNull: true },
            sent_service: { type: DataTypes.UUID, allowNull: true },
            message_state: DataTypes.ENUM(...Object.keys(MessageStates)),
            cost: DataTypes.INTEGER
        }, {
            sequelize: sequelize,
            tableName: "messages"
        })
    }
}