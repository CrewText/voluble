import * as Sequelize from "sequelize"
import { OrgInstance, OrgAttributes } from "./organization";
import { ContactInstance, ContactAttributes } from "./contact";

export interface UserAttributes {
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
    OrganizationId?: string,
    auth0_id: string,
}

export interface UserInstance extends Sequelize.Instance<UserAttributes>, UserAttributes {
    getOrganization: Sequelize.BelongsToGetAssociationMixin<OrgInstance>,
    setOrganization: Sequelize.BelongsToSetAssociationMixin<OrgInstance, OrgInstance['id']>,
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgAttributes, OrgInstance>,

    getContact: Sequelize.BelongsToGetAssociationMixin<ContactInstance>,
    setContact: Sequelize.BelongsToSetAssociationMixin<ContactInstance, ContactInstance['id']>,
    createContact: Sequelize.BelongsToCreateAssociationMixin<ContactAttributes, ContactInstance>,
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        auth0_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
    })

    return User
}