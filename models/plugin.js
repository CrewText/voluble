let plugin_model = function (sequelize, DataTypes) {
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

module.exports = plugin_model