import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize, DataTypes } from 'sequelize';
import { Contact as ContactAttributes } from 'voluble-common';
import { Category } from "./category";
import { Message } from "./message";
import { Organization } from './organization';
import { Servicechain } from './servicechain';

export class Contact extends Model implements ContactAttributes {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public title!: string
    public first_name!: string
    public surname!: string
    public email_address!: string
    public phone_number!: string

    public getServicechain!: BelongsToGetAssociationMixin<Servicechain>
    public setServicechain!: BelongsToSetAssociationMixin<Servicechain, Servicechain['id']>
    public createServicechain!: BelongsToCreateAssociationMixin<Servicechain>

    public getOrganization!: BelongsToGetAssociationMixin<Organization>
    public setOrganization!: BelongsToSetAssociationMixin<Organization, Organization['id']>
    public createOrganization!: BelongsToCreateAssociationMixin<Organization>

    public getCategory!: BelongsToGetAssociationMixin<Category>
    public setCategory!: BelongsToSetAssociationMixin<Category, Category['id']>
    public createCategory!: BelongsToCreateAssociationMixin<Category>

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
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            title: { type: DataTypes.STRING, allowNull: false },
            first_name: { type: DataTypes.STRING, allowNull: false },
            surname: { type: DataTypes.STRING, allowNull: false },
            email_address: { type: DataTypes.STRING, validate: { isEmail: true } },
            phone_number: { type: DataTypes.STRING, allowNull: false },
        }, {
            sequelize: sequelize,
            tableName: "contacts"
        })
    }
}