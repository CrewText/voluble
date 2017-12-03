const user_settings = require('../user_settings')
const Sequelize = require('sequelize')
const path = require('path');
const basename = path.basename(__filename);
const fs = require('fs')
const winston = require('winston')

var db = {}
var sequelize = new Sequelize(user_settings.db_credentials.db,
    user_settings.db_credentials.user,
    user_settings.db_credentials.password,
    {
        host: user_settings.db_credentials.host,
        dialect: 'mysql',
        benchmark: true
    }
)

fs
    .readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        var model = sequelize['import'](path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

sequelize.sync()

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;