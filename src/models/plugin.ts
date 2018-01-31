import * as Sequelize from "sequelize"

export interface PluginAttributes {
    name: String,
    directory_name: String,
    initialized: Boolean
}

export interface PluginInstance extends Sequelize.Instance<PluginAttributes> {
    id: number,
    createdAt: Date,
    updatedAt: Date,

    name: String,
    directory_name: String,
    initialized: Boolean
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