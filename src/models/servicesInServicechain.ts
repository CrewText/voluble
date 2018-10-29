import * as Sequelize from "sequelize"

export interface ServicesInSCAttributes {
    servicechain_id: number,
    service_id: string,
    priority: number
}

export interface ServicesInSCInstance extends Sequelize.Instance<ServicesInSCAttributes> {
    id: number,
    createdAt: Date,
    updatedAt: Date,

    servicechain_id: number,
    service_id: string,
    priority: number
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var ServicesInSC = sequelize.define('ServicesInSC', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        priority: DataTypes.INTEGER
    })

    return ServicesInSC
}