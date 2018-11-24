import * as Sequelize from "sequelize"

export interface OrgAttributes {
    name: string,
    auth0_id: string
}

export interface OrgInstance extends Sequelize.Instance<OrgAttributes> {
    id: string,
    createdAt: Date,
    updatedAt: Date,

    name: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Organization = sequelize.define('Organization', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING
    })

    return Organization
}