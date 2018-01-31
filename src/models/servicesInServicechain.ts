import * as Sequelize from "sequelize"
import { SequelizeLoDash } from "sequelize";

export interface ServicesInSCAttributes {
    servicechain_id: number,
    service_id: number,
    priority: number
}

export interface ServicesInSCInstance extends Sequelize.Instance<ServicesInSCAttributes>{
    id: number,
    createdAt: Date,
    updatedAt: Date,

    servicechain_id: number,
    service_id: number,
    priority: number
}

export default function (sequelize: Sequelize.Sequelize, DataTypes:Sequelize.DataTypes) {
    var ServicesInSC = sequelize.define('ServicesInSC', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        servicechain_id: DataTypes.BIGINT,
        service_id: DataTypes.BIGINT,
        priority: DataTypes.INTEGER
    })

    return ServicesInSC
}