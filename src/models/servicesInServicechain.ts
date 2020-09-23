import { DataTypes, Model, Sequelize } from 'sequelize';
import { ServicesInSC as ServicesInSCAttributes } from 'voluble-common';

export class ServicesInSC extends Model implements ServicesInSCAttributes {
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public id!: string

    public service!: string
    public servicechain!: string
    public priority!: number

    public static initModel(sequelize: Sequelize): Model<ServicesInSC, null> {
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