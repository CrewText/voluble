import * as Sequelize from "sequelize"

export interface OrgAttributes {
    name: string,
    auth0_id: string
}

export interface OrgInstance extends Sequelize.Instance<OrgAttributes>{
    id: number,
    createdAt: Date,
    updatedAt: Date,

    name: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Organization = sequelize.define('Organization', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        name: DataTypes.STRING
    })

    return Organization
}