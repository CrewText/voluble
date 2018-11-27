import * as Sequelize from "sequelize"

export interface ServicesInSCAttributes {
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
    servicechain_id: string,
    service_id: string,
    priority: number
}

export interface ServicesInSCInstance extends Sequelize.Instance<ServicesInSCAttributes>, ServicesInSCAttributes {
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var ServicesInSC = sequelize.define('ServicesInSC', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        priority: DataTypes.INTEGER
    })

    return ServicesInSC
}