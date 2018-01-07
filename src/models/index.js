const Sequelize = require('sequelize')
const path = require('path');
const basename = path.basename(__filename);
const fs = require('fs')
const winston = require('winston')

var db = {}
var sequelize = new Sequelize(process.env.JAWSDB_MARIA_URL,{dialect: 'mysql'})

// TODO: #5 Set up associations between models, reduce the need for validation

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