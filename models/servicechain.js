let sc_model = function (sequelize, DataTypes) {
    var Servicechain = sequelize.define('Servicechain', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        name: DataTypes.STRING
    })

    return Servicechain
}

module.exports = sc_model