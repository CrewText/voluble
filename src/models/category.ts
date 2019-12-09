import * as Sequelize from "sequelize";
import { Category as CategoryAttributes, Org as OrgAttributes, Contact as ContactAttributes } from 'voluble-common';
import { ContactInstance } from "./contact";
import { OrgInstance } from "./organization";

export interface CategoryInstance extends Sequelize.Instance<CategoryAttributes>, CategoryAttributes {
    getOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgAttributes, OrgInstance>
    setOrganization: Sequelize.BelongsToSetAssociationMixin<OrgInstance, OrgInstance['id']>
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgAttributes, OrgInstance>

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
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Category = sequelize.define('Category', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING, allowNull: false }
    })

    return Category
}