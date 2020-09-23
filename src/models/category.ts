import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize } from 'sequelize';
import { Category as CategoryAttributes } from 'voluble-common';

import { Contact } from "./contact";
import { Organization } from "./organization";


export class Category extends Model implements CategoryAttributes {
    public id!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public name: string

    public getOrganization!: BelongsToGetAssociationMixin<Organization>
    public setOrganization!: BelongsToSetAssociationMixin<Organization, Organization['id']>
    public createOrganization!: BelongsToCreateAssociationMixin<Organization>

    public getContacts!: HasManyGetAssociationsMixin<Contact>
    public setContacts!: HasManySetAssociationsMixin<Contact, Contact['id']>
    public addContact!: HasManyAddAssociationMixin<Contact, Contact['id']>
    public addContacts!: HasManyAddAssociationsMixin<Contact, Contact['id']>
    public createContact!: HasManyCreateAssociationMixin<Contact>
    public countContacts!: HasManyCountAssociationsMixin
    public hasContact!: HasManyHasAssociationMixin<Contact, Contact['id']>
    public hasContacts!: HasManyHasAssociationsMixin<Contact, Contact['id']>
    public removeContact!: HasManyRemoveAssociationMixin<Contact, Contact['id']>
    public removeContacts!: HasManyRemoveAssociationsMixin<Contact, Contact['id']>

    public static initModel(sequelize: Sequelize): Model<Category, null> {
        return Category.init({
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING, allowNull: false }
        },
            {
                sequelize: sequelize,
                tableName: "categories"
            })
    }
}