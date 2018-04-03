import * as Sequelize from "sequelize"

export interface PluginAttributes {
    name: string,
    directory_name: string,
    initialized: boolean
}

export interface PluginInstance extends Sequelize.Instance<PluginAttributes> {
    id: number,
    createdAt: Date,
    updatedAt: Date,

    name: string,
    directory_name: string,
    initialized: boolean
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Plugin = sequelize.define('Plugin', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        name: DataTypes.STRING,
        directory_name: DataTypes.STRING,
        initialized: DataTypes.BOOLEAN
    })

    return Plugin
}