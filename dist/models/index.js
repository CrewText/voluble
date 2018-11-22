"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Sequelize = require("sequelize");
const path = require("path");
const basename = path.basename(__filename);
const fs = require("fs");
const winston = require('winston');
exports.models = {};
exports.sequelize = new Sequelize(process.env.CLEARDB_DATABASE_URL || "localhost", { dialect: 'mysql', logging: false });
fs
    .readdirSync(__dirname)
    .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
})
    .forEach(file => {
    var model = exports.sequelize.import(path.join(__dirname, file));
    exports.models[model["name"]] = model;
});
Object.keys(exports.models).forEach(modelName => {
    if (exports.models[modelName].associate) {
        exports.models[modelName].associate(exports.models);
    }
});
exports.models.Organization.hasMany(exports.models.User);
exports.models.User.belongsTo(exports.models.Organization);
exports.models.Organization.hasMany(exports.models.Contact);
exports.models.Contact.belongsTo(exports.models.Organization);
exports.models.Service.belongsToMany(exports.models.Servicechain, { through: exports.models.ServicesInSC });
exports.models.Servicechain.belongsToMany(exports.models.Service, { through: exports.models.ServicesInSC });
exports.models.Servicechain.hasOne(exports.models.Contact);
exports.models.Contact.belongsTo(exports.models.Servicechain);
exports.models.Servicechain.hasOne(exports.models.Message);
exports.models.Message.belongsTo(exports.models.Servicechain);
exports.models.Blast.hasMany(exports.models.Message);
exports.models.Sequelize = Sequelize;
function initialize_database() {
    exports.sequelize.sync();
}
exports.initialize_database = initialize_database;
