import * as Sequelize from "sequelize";
import { Category as CategoryAttributes, Contact as ContactAttributes, Org as OrgAttributes, Servicechain as ServicechainAttributes, User as UserAttributes } from 'voluble-common';
import { getE164PhoneNumber } from '../utilities';
import { CategoryInstance } from "./category";
import { ContactInstance } from "./contact";
import { ServicechainInstance } from "./servicechain";
import { UserInstance } from "./user";

export interface OrgInstance extends Sequelize.Instance<OrgAttributes>, OrgAttributes {
    getUsers: Sequelize.HasManyGetAssociationsMixin<UserInstance>
    setUsers: Sequelize.HasManySetAssociationsMixin<UserInstance, UserInstance['id']>,
    addUser: Sequelize.HasManyAddAssociationMixin<UserInstance, UserInstance['id']>,
    addUsers: Sequelize.HasManyAddAssociationsMixin<UserInstance, UserInstance['id']>,
    createUser: Sequelize.HasManyCreateAssociationMixin<UserAttributes, UserInstance>,
    countUsers: Sequelize.HasManyCountAssociationsMixin
    hasUser: Sequelize.HasManyHasAssociationMixin<UserInstance, UserInstance['id']>,
    hasUsers: Sequelize.HasManyHasAssociationsMixin<UserInstance, UserInstance['id']>,
    removeUser: Sequelize.HasManyRemoveAssociationMixin<UserAttributes, UserInstance['id']>,
    removeUsers: Sequelize.HasManyRemoveAssociationsMixin<UserInstance, UserInstance['id']>

    getContacts: Sequelize.HasManyGetAssociationsMixin<ContactInstance>
    setContacts: Sequelize.HasManySetAssociationsMixin<ContactInstance, ContactInstance['id']>,
    addContact: Sequelize.HasManyAddAssociationMixin<ContactInstance, ContactInstance['id']>,
    addContacts: Sequelize.HasManyAddAssociationsMixin<ContactInstance, ContactInstance['id']>,
    createContact: Sequelize.HasManyCreateAssociationMixin<ContactAttributes, ContactInstance>,
    countContacts: Sequelize.HasManyCountAssociationsMixin
    hasContact: Sequelize.HasManyHasAssociationMixin<ContactInstance, ContactInstance['id']>,
    hasContacts: Sequelize.HasManyHasAssociationsMixin<ContactInstance, ContactInstance['id']>,
    removeContact: Sequelize.HasManyRemoveAssociationMixin<ContactAttributes, ContactInstance['id']>,
    removeContacts: Sequelize.HasManyRemoveAssociationsMixin<ContactInstance, ContactInstance['id']>

    getServicechains: Sequelize.HasManyGetAssociationsMixin<ServicechainInstance>
    setServicechains: Sequelize.HasManySetAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>,
    addServicechain: Sequelize.HasManyAddAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    addServicechains: Sequelize.HasManyAddAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>,
    createServicechain: Sequelize.HasManyCreateAssociationMixin<ServicechainAttributes, ServicechainInstance>,
    countServicechains: Sequelize.HasManyCountAssociationsMixin
    hasServicechain: Sequelize.HasManyHasAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    hasServicechains: Sequelize.HasManyHasAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>,
    removeServicechain: Sequelize.HasManyRemoveAssociationMixin<ServicechainAttributes, ServicechainInstance['id']>,
    removeServicechains: Sequelize.HasManyRemoveAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>

    getCategories: Sequelize.HasManyGetAssociationsMixin<CategoryInstance>
    setCategories: Sequelize.HasManySetAssociationsMixin<CategoryInstance, CategoryInstance['id']>,
    addCategory: Sequelize.HasManyAddAssociationMixin<CategoryInstance, CategoryInstance['id']>,
    addCategories: Sequelize.HasManyAddAssociationsMixin<CategoryInstance, CategoryInstance['id']>,
    createCategory: Sequelize.HasManyCreateAssociationMixin<CategoryAttributes, CategoryInstance>,
    countCategories: Sequelize.HasManyCountAssociationsMixin
    hasCategory: Sequelize.HasManyHasAssociationMixin<CategoryInstance, CategoryInstance['id']>,
    hasCategories: Sequelize.HasManyHasAssociationsMixin<CategoryInstance, CategoryInstance['id']>,
    removeCategory: Sequelize.HasManyRemoveAssociationMixin<CategoryAttributes, CategoryInstance['id']>,
    removeCategories: Sequelize.HasManyRemoveAssociationsMixin<CategoryInstance, CategoryInstance['id']>

}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Organization = sequelize.define('Organization', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING,
        phone_number: {
            type: DataTypes.STRING, allowNull: false, validate: {
                isPhoneNumber(value) { return getE164PhoneNumber(value) }
            }
        }
    })

    return Organization
}