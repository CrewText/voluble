import * as Sequelize from "sequelize";
import { Contact as ContactAttributes, Message as MessageAttributes, Org as OrgAttributes, Servicechain as ServicechainAttributes, Category as CategoryAttributes } from 'voluble-common';
import { MessageInstance } from "./message";
import { OrgInstance } from './organization';
import { ServicechainInstance } from './servicechain';
import { CategoryInstance } from "./category";

export interface ContactInstance extends Sequelize.Instance<ContactAttributes>, ContactAttributes {

    getServicechain: Sequelize.BelongsToGetAssociationMixin<ServicechainInstance>,
    setServicechain: Sequelize.BelongsToSetAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    createServicechain: Sequelize.BelongsToCreateAssociationMixin<ServicechainAttributes, ServicechainInstance>,

    getOrganization: Sequelize.BelongsToGetAssociationMixin<OrgInstance>,
    setOrganization: Sequelize.BelongsToSetAssociationMixin<OrgInstance, OrgInstance['id']>,
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgAttributes, OrgInstance>

    getCategory: Sequelize.BelongsToGetAssociationMixin<CategoryInstance>,
    setCategory: Sequelize.BelongsToSetAssociationMixin<CategoryInstance, CategoryInstance['id']>,
    createCategory: Sequelize.BelongsToCreateAssociationMixin<CategoryAttributes, CategoryInstance>,

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