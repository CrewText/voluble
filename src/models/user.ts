import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, DataTypes, Model, Sequelize } from 'sequelize';
import { User as UserAttributes } from 'voluble-common';
import { Contact } from "./contact";
import { Organization } from "./organization";

export class User extends Model implements UserAttributes {
    public id!: string
    public OrganizationId!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date

    public getOrganization!: BelongsToGetAssociationMixin<Organization>
    public setOrganization!: BelongsToSetAssociationMixin<Organization, Organization['id']>
    public createOrganization!: BelongsToCreateAssociationMixin<Organization>

    public getContact!: BelongsToGetAssociationMixin<Contact>
    public setContact!: BelongsToSetAssociationMixin<Contact, Contact['id']>
    public createContact!: BelongsToCreateAssociationMixin<Contact>

    public static initModel(sequelize: Sequelize) {
        return this.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            }
        },
            {
                sequelize,
                tableName: "users"
            })
    }
}