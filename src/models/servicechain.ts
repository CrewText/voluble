import * as Sequelize from "sequelize"

export interface ServicechainAttributes {
    name: string,
}

export interface ServicechainInstance extends Sequelize.Instance<ServicechainAttributes> {
    id: string,
    createdAt: Date,
    updatedAt: Date,

    name: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Servicechain = sequelize.define('Servicechain', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING
    })

    return Servicechain
}
