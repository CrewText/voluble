const user_settings = require('../user_settings')
const Sequelize = require('sequelize')
const Q = require('q')

db = {
    db_conn: null,

    init_connection: function () {
        conn = new Sequelize(user_settings.db_credentials.db,
            user_settings.db_credentials.user,
            user_settings.db_credentials.password, {
                host: user_settings.db_credentials.host,
                dialect: 'mysql'
            })

        conn.authenticate()
        .then(function(){
            console.log("Connection established successfully")
            db.db_conn = conn
            return db.db_conn
        })
        .catch(function(err){
            console.log("Could not connect to database! Reason:\n" + err.reason)
            return null
        }).done()
    }
}

module.exports = db