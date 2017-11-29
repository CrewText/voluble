let contact_model = function (sequelize, DataTypes) {
    var Contact = sequelize.define('Contact', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: DataTypes.STRING,
        surname: DataTypes.STRING,
        email_address: DataTypes.STRING,
        default_servicechain: DataTypes.INTEGER
    })

    return Contact
}

module.exports = contact_model