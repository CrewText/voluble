import { DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize, Association } from 'sequelize';
import { Org as OrgAttributes, PlanTypes } from 'voluble-common';
import { getE164PhoneNumber } from '../utilities';
import { Category } from "./category";
import { Contact } from "./contact";
import { Servicechain } from "./servicechain";
import { User } from "./user";

export class Organization extends Model implements OrgAttributes {
    public id!: string
    public name!: string
    public phone_number!: string
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
    public credits!: number
    public plan!: PlanTypes

    // public static associations: {
    //     users: Association<OrganizationModel, UserModel>
    // }

    public getUsers!: HasManyGetAssociationsMixin<User>
    public setUsers!: HasManySetAssociationsMixin<User, User['id']>
    public addUser!: HasManyAddAssociationMixin<User, User['id']>
    public addUsers!: HasManyAddAssociationsMixin<User, User['id']>
    public createUser!: HasManyCreateAssociationMixin<User>
    public countUsers!: HasManyCountAssociationsMixin
    public hasUser!: HasManyHasAssociationMixin<User, User['id']>
    public hasUsers!: HasManyHasAssociationsMixin<User, User['id']>
    public removeUser!: HasManyRemoveAssociationMixin<User, User['id']>
    public removeUsers!: HasManyRemoveAssociationsMixin<User, User['id']>

    public getContacts!: HasManyGetAssociationsMixin<Contact>
    public setContacts!: HasManySetAssociationsMixin<Contact, Contact['id']>
    public addContact!: HasManyAddAssociationMixin<Contact, Contact['id']>
    public addContacts!: HasManyAddAssociationsMixin<Contact, Contact['id']>
    public createContact: HasManyCreateAssociationMixin<Contact>
    public countContacts!: HasManyCountAssociationsMixin
    public hasContact!: HasManyHasAssociationMixin<Contact, Contact['id']>
    public hasContacts!: HasManyHasAssociationsMixin<Contact, Contact['id']>
    public removeContact!: HasManyRemoveAssociationMixin<Contact, Contact['id']>
    public removeContacts!: HasManyRemoveAssociationsMixin<Contact, Contact['id']>

    public getServicechains!: HasManyGetAssociationsMixin<Servicechain>
    public setServicechains!: HasManySetAssociationsMixin<Servicechain, Servicechain['id']>
    public addServicechain!: HasManyAddAssociationMixin<Servicechain, Servicechain['id']>
    public addServicechains!: HasManyAddAssociationsMixin<Servicechain, Servicechain['id']>
    public createServicechain!: HasManyCreateAssociationMixin<Servicechain>
    public countServicechains!: HasManyCountAssociationsMixin
    public hasServicechain!: HasManyHasAssociationMixin<Servicechain, Servicechain['id']>
    public hasServicechains!: HasManyHasAssociationsMixin<Servicechain, Servicechain['id']>
    public removeServicechain!: HasManyRemoveAssociationMixin<Servicechain, Servicechain['id']>
    public removeServicechains!: HasManyRemoveAssociationsMixin<Servicechain, Servicechain['id']>

    public getCategories!: HasManyGetAssociationsMixin<Category>
    public setCategories!: HasManySetAssociationsMixin<Category, Category['id']>
    public addCategory!: HasManyAddAssociationMixin<Category, Category['id']>
    public addCategories!: HasManyAddAssociationsMixin<Category, Category['id']>
    public createCategory!: HasManyCreateAssociationMixin<Category>
    public countCategories!: HasManyCountAssociationsMixin
    public hasCategory!: HasManyHasAssociationMixin<Category, Category['id']>
    public hasCategories!: HasManyHasAssociationsMixin<Category, Category['id']>
    public removeCategory!: HasManyRemoveAssociationMixin<Category, Category['id']>
    public removeCategories!: HasManyRemoveAssociationsMixin<Category, Category['id']>

    public static initModel(sequelize: Sequelize) {
        return this.init({
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: DataTypes.STRING,
            phone_number: {
                type: DataTypes.STRING, allowNull: false, validate: {
                    isPhoneNumber(value: string) { return getE164PhoneNumber(value) }
                }
            },
            credits: {
                type: DataTypes.BIGINT, allowNull: true, defaultValue: 0,
                validate: {
                    isGtEqZero(val: number) { return val >= 0 }
                }
            },
            plan: {
                type: DataTypes.ENUM(...Object.values(PlanTypes)),
                allowNull: false, defaultValue: PlanTypes.PAY_IN_ADVANCE
            }
        },
            {
                sequelize,
                tableName: "organizations"
            })
    }

}