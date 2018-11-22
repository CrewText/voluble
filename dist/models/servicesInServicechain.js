"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(sequelize, DataTypes) {
    var ServicesInSC = sequelize.define('ServicesInSC', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        priority: DataTypes.INTEGER
    });
    return ServicesInSC;
}
exports.default = default_1;
