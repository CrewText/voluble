import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyCreateAssociationMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, DataTypes, Model, Sequelize } from 'sequelize';
import { Service as ServiceAttributes } from 'voluble-common';

import { Servicechain } from "./servicechain";
import { ServicesInSC } from './servicesInServicechain';


export class Service extends Model implements ServiceAttributes {
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public id!: string
    public name!: string
    public directory_name!: string

    public ServicesInSC!: ServicesInSC

    public createServicechain!: BelongsToManyCreateAssociationMixin<Servicechain>
    public getServicechains!: BelongsToManyGetAssociationsMixin<Servicechain>
    public addServicechain!: BelongsToManyAddAssociationMixin<Servicechain, Servicechain['id']>
    public addServicechains!: BelongsToManyAddAssociationsMixin<Servicechain, Servicechain['id']>
    public countServicechains!: BelongsToManyCountAssociationsMixin
    public hasServicechain!: BelongsToManyHasAssociationMixin<Servicechain, Servicechain['id']>
    public hasServicechains!: BelongsToManyHasAssociationsMixin<Servicechain, Servicechain['id']>
    public removeServicechain!: BelongsToManyRemoveAssociationMixin<Servicechain, Servicechain['id']>
    public removeServicechains!: BelongsToManyRemoveAssociationsMixin<Servicechain, Servicechain['id']>
    public setServicechains!: BelongsToManySetAssociationsMixin<Servicechain, Servicechain['id']>

    public static initModel(sequelize: Sequelize): Model<Service, null> {
        return this.init({
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: DataTypes.STRING,
            directory_name: DataTypes.STRING,
        },
            {
                sequelize: sequelize,
                tableName: "services"
            })
    }
}