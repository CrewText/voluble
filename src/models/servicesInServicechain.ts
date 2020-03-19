import { ServicesInSC as ServicesInSCAttributes } from 'voluble-common';
import { Sequelize, Model, DataTypes } from 'sequelize';

export class ServicesInSC extends Model implements ServicesInSCAttributes {
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public id!: string

    public service!: string
    public servicechain!: string
    public priority!: number

    public static initModel(sequelize: Sequelize) {
        return this.init({
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            priority: DataTypes.INTEGER
        },
            {
                sequelize: sequelize,
                tableName: "servicesinscs"
            })
    }
}