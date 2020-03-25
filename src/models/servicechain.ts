import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyCreateAssociationMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToSetAssociationMixin, DataTypes, Model, Sequelize, HasManyAddAssociationMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, HasMany, HasManyHasAssociationsMixin, HasManyAddAssociationsMixin, HasManyHasAssociationMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import { Servicechain as ServicechainAttributes } from 'voluble-common';
import { Organization } from "./organization";
import { Service } from "./service";

export class Servicechain extends Model implements ServicechainAttributes {
    public id!: string
    public name!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public createService!: BelongsToManyCreateAssociationMixin<Service>
    public getServices!: BelongsToManyGetAssociationsMixin<Service>
    public addService!: BelongsToManyAddAssociationMixin<Service, Service['id']>
    public addServices!: BelongsToManyAddAssociationsMixin<Service, Service['id']>
    public countServices!: BelongsToManyCountAssociationsMixin
    public hasService!: BelongsToManyHasAssociationMixin<Service, Service['id']>
    public hasServices!: BelongsToManyHasAssociationsMixin<Service, Service['id']>
    public removeService!: BelongsToManyRemoveAssociationMixin<Service, Service['id']>
    public removeServices!: BelongsToManyRemoveAssociationsMixin<Service, Service['id']>
    public setServices!: BelongsToManySetAssociationsMixin<Service, Service['id']>
    // public getServices!: HasManyGetAssociationsMixin<ServiceModel>
    // public setServices!: HasManySetAssociationsMixin<ServiceModel, ServiceModel['id']>
    // public hasServices!: HasManyHasAssociationsMixin<ServiceModel, ServiceModel['id']>
    // public addServices!: HasManyAddAssociationsMixin<ServiceModel, ServiceModel['id']>
    // public getService!: HasManyGetAssociationsMixin<ServiceModel>
    // public hasService!: HasManyHasAssociationMixin<ServiceModel, ServiceModel['id']>
    // public addService!: HasManyAddAssociationMixin<ServiceModel, ServiceModel['id']>
    // public countServices!: HasManyCountAssociationsMixin
    // public createService!: HasManyCreateAssociationMixin<ServiceModel>

    public getOrganization!: BelongsToGetAssociationMixin<Organization>
    public setOrganization!: BelongsToSetAssociationMixin<Organization, Organization['id']>
    public createOrganization!: BelongsToCreateAssociationMixin<Organization>

    public static initModel(sequelize: Sequelize) {
        return this.init({
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: DataTypes.STRING
        },
            {
                sequelize: sequelize,
                tableName: "servicechains"
            }
        )
    }
}