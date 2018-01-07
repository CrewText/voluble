let blast_model = function (sequelize, DataTypes) {
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

module.exports = blast_model