let svc_in_sc_model = function (sequelize, DataTypes) {
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

module.exports = svc_in_sc_model