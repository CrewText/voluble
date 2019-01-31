import * as Sequelize from "sequelize";
import { Service as ServiceAttributes, Servicechain as ServicechainAttributes, ServicesInSC as ServicesInSCAttributes } from 'voluble-common';
import { ServicechainInstance } from "./servicechain";

export interface ServiceInstance extends Sequelize.Instance<ServiceAttributes>, ServiceAttributes {
    createServicechain: Sequelize.BelongsToManyCreateAssociationMixin<ServicechainAttributes, ServicechainInstance, ServicesInSCAttributes>
    getServicechains: Sequelize.BelongsToManyGetAssociationsMixin<ServicechainInstance>,
    addServicechain: Sequelize.BelongsToManyAddAssociationMixin<ServicechainInstance, ServicechainInstance['id'], ServicesInSCAttributes>,
    addServicechains: Sequelize.BelongsToManyAddAssociationsMixin<ServicechainInstance, ServicechainInstance['id'], ServicesInSCAttributes>,
    countServicechains: Sequelize.BelongsToManyCountAssociationsMixin,
    hasServicechain: Sequelize.BelongsToManyHasAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    hasServicechains: Sequelize.BelongsToManyHasAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>,
    removeServicechain: Sequelize.BelongsToManyRemoveAssociationMixin<ServicechainInstance, ServicechainInstance['id']>,
    removeServicechains: Sequelize.BelongsToManyRemoveAssociationsMixin<ServicechainInstance, ServicechainInstance['id']>,
    setServicechains: Sequelize.BelongsToManySetAssociationsMixin<ServicechainInstance, ServicechainInstance['id'], ServicesInSCAttributes>

}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Service = sequelize.define('Service', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING,
        directory_name: DataTypes.STRING,
    })

    return Service
}