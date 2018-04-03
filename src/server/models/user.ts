import * as Sequelize from "sequelize"

export interface UserAttributes {
    auth0_id: string,
    org_number: number | null
}

export interface UserInstance extends Sequelize.Instance<UserAttributes>{
    id: number,
    createdAt: Date,
    updatedAt: Date,

    auth0_id: string,
    org_member: number | null
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var User = sequelize.define('User', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        auth0_id: DataTypes.STRING,
        org_number: DataTypes.BIGINT
    })

    return User
}