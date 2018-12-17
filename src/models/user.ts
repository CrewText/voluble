import * as Sequelize from "sequelize"
import { OrgInstance } from "./organization";
import { ContactInstance } from "./contact";

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
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgInstance>,

    getContact: Sequelize.BelongsToGetAssociationMixin<ContactInstance>,
    setContact: Sequelize.BelongsToSetAssociationMixin<ContactInstance, ContactInstance['id']>,
    createContact: Sequelize.BelongsToCreateAssociationMixin<ContactInstance>,
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