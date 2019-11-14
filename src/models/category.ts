import * as Sequelize from "sequelize";
import { Category as CategoryAttributes } from 'voluble-common';

export interface CategoryInstance extends Sequelize.Instance<CategoryAttributes>, CategoryAttributes {

}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Category = sequelize.define('Contact', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING, allowNull: false }
    })

    return Category
}