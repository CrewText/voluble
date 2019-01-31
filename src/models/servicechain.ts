import * as Sequelize from "sequelize";
import { Service as ServiceAttributes, Servicechain as ServicechainAttributes, ServicesInSC as ServicesInSCAttributes, Org as OrgAttributes } from 'voluble-common';
import { OrgInstance } from "./organization";
import { ServiceInstance } from "./service";

export interface ServicechainInstance extends Sequelize.Instance<ServicechainAttributes>, ServicechainAttributes {
    createService: Sequelize.BelongsToManyCreateAssociationMixin<ServiceAttributes, ServiceInstance, ServicesInSCAttributes>
    getServices: Sequelize.BelongsToManyGetAssociationsMixin<ServiceInstance>,
    addService: Sequelize.BelongsToManyAddAssociationMixin<ServiceInstance, ServiceInstance['id'], ServicesInSCAttributes>,
    addServices: Sequelize.BelongsToManyAddAssociationsMixin<ServiceInstance, ServiceInstance['id'], ServicesInSCAttributes>,
    countServices: Sequelize.BelongsToManyCountAssociationsMixin,
    hasService: Sequelize.BelongsToManyHasAssociationMixin<ServiceInstance, ServiceInstance['id']>,
    hasServices: Sequelize.BelongsToManyHasAssociationsMixin<ServiceInstance, ServiceInstance['id']>,
    removeService: Sequelize.BelongsToManyRemoveAssociationMixin<ServiceInstance, ServiceInstance['id']>,
    removeServices: Sequelize.BelongsToManyRemoveAssociationsMixin<ServiceInstance, ServiceInstance['id']>,
    setServices: Sequelize.BelongsToManySetAssociationsMixin<ServiceInstance, ServiceInstance['id'], ServicesInSCAttributes>

    getOrganization: Sequelize.BelongsToGetAssociationMixin<OrgInstance>,
    setOrganization: Sequelize.BelongsToSetAssociationMixin<OrgInstance, OrgInstance['id']>,
    createOrganization: Sequelize.BelongsToCreateAssociationMixin<OrgInstance, OrgAttributes>,
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Servicechain = sequelize.define('Servicechain', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING
    })

    return Servicechain
}
