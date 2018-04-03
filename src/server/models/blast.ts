import * as Sequelize from "sequelize"

export interface BlastAttributes {
    name: string
}

export interface BlastInstance extends Sequelize.Instance<BlastAttributes> {
    id: number,
    createdAt: Date,
    updatedAt: Date,

    name: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Blast = sequelize.define('Blast', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        name: DataTypes.STRING
    })

    return Blast
}