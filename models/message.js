let message_model = function(sequelize, DataTypes){
    var Message = sequelize.define('Message',{
        message_body: DataTypes.STRING
    })

    return Message
}

module.exports = message_model