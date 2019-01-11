import * as Sequelize from "sequelize"
import { ServicechainInstance } from './servicechain'
import { OrgInstance } from './organization'
import { MessageInstance, MessageAttributes } from "./message";

export interface ContactAttributes {
    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    ServicechainId?: string,
    OrganizationId?: string
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
}

export interface ContactInstance extends Sequelize.Instance<ContactAttributes>, ContactAttributes {
    //id: string,
    //createdAt: Date,
    //updatedAt: Date,

    //first_name: string,
    //surname: string,
    //email_address: string,
    //phone_number: string,
    getServicechain: Sequelize.BelongsToGetAssociationMixin<ServicechainInstance>,
    setServicechain: Sequelize.BelongsToSetAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    createServicechain: Sequelize.BelongsToCreateAssociationMixin<ServicechainInstance>,

    getOrganization: Sequelize.BelongsToGetAssociationMixin<OrgInstance>,
    setOrganization: Sequelize.BelongsToSetAssociationMixin<OrgInstance, OrgInstance['id']>,
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgInstance>

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
    var Contact = sequelize.define('Contact', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        first_name: { type: DataTypes.STRING, allowNull: false },
        surname: { type: DataTypes.STRING, allowNull: false },
        email_address: { type: DataTypes.STRING, validate: { isEmail: true } },
        phone_number: { type: DataTypes.STRING, allowNull: false },
    })

    return Contact
}