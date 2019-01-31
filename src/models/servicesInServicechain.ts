import * as Sequelize from "sequelize";
import { ServicesInSC as ServicesInSCAttributes } from 'voluble-common';

export interface ServicesInSCInstance extends Sequelize.Instance<ServicesInSCAttributes>, ServicesInSCAttributes {
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var ServicesInSC = sequelize.define('ServicesInSC', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        priority: DataTypes.INTEGER
    })

    return ServicesInSC
}