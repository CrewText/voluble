import * as Sequelize from "sequelize"

export interface ServiceAttributes {
    name: string,
    directory_name: string,
}

export interface ServiceInstance extends Sequelize.Instance<ServiceAttributes> {
    id: number,
    createdAt: Date,
    updatedAt: Date,

    name: string,
    directory_name: string,
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Service = sequelize.define('Service', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING,
        directory_name: DataTypes.STRING,
    })

    return Service
}