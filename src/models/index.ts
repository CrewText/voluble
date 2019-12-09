import * as Promise from 'bluebird';
import * as fs from "fs";
import * as path from "path";
import * as Sequelize from "sequelize";
import { Blast as BlastAttributes, Contact as ContactAttributes, Category as CategoryAttributes, Message as MessageAttributes, Org as OrgAttributes, Service as ServiceAttributes, Servicechain as ServicechainAttributes, ServicesInSC as ServicesInSCAttributes, User as UserAttributes } from 'voluble-common';
import * as Blast from './blast';
import * as Contact from './contact';
import * as Category from './category'
import * as Message from './message';
import * as Organization from './organization';
import * as Service from './service';
import * as Servicechain from './servicechain';
import * as ServiceInSC from './servicesInServicechain';
import * as User from './user';
const basename = path.basename(__filename);
const winston = require('winston')

export type ContactInstance = Contact.ContactInstance
export type CategoryInstance = Category.CategoryInstance
export type MessageInstance = Message.MessageInstance
export type ServiceInstance = Service.ServiceInstance
export type ServicechainInstance = Servicechain.ServicechainInstance
export type ServicesInSCInstance = ServiceInSC.ServicesInSCInstance
export type BlastInstance = Blast.BlastInstance
export type OrganizationInstance = Organization.OrgInstance
export type UserInstance = User.UserInstance

export interface DbConnection {
    Contact: Sequelize.Model<Contact.ContactInstance, ContactAttributes>,
    Category: Sequelize.Model<Category.CategoryInstance, CategoryAttributes>,
    Message: Sequelize.Model<Message.MessageInstance, MessageAttributes>,
    Service: Sequelize.Model<Service.ServiceInstance, ServiceAttributes>,
    Servicechain: Sequelize.Model<Servicechain.ServicechainInstance, ServicechainAttributes>,
    ServicesInSC: Sequelize.Model<ServiceInSC.ServicesInSCInstance, ServicesInSCAttributes>,
    Blast: Sequelize.Model<Blast.BlastInstance, BlastAttributes>,
    User: Sequelize.Model<User.UserInstance, UserAttributes>
    Organization: Sequelize.Model<Organization.OrgInstance, OrgAttributes>
    [key: string]: any
}


//@ts-ignore
export var models: DbConnection = {}
let db_url = process.env.NODE_ENV == "test" ? "mysql://root@localhost/voluble_test" : process.env.CLEARDB_DATABASE_URL

export var sequelize = new Sequelize(db_url, { dialect: 'mysql', logging: false })

fs
    .readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        var model = sequelize.import(path.join(__dirname, file));
        models[model["name"]] = model;
    });

Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

models.Organization.hasMany(models.User)
models.User.belongsTo(models.Organization)

models.Organization.hasMany(models.Contact)
models.Contact.belongsTo(models.Organization)

models.Message.belongsTo(models.Contact, { foreignKey: "contact" })
models.Contact.hasMany(models.Message, { foreignKey: "contact" })

models.Contact.belongsTo(models.Category)
models.Category.hasMany(models.Contact)

models.Category.belongsTo(models.Organization)
models.Organization.hasMany(models.Category)

models.Service.belongsToMany(models.Servicechain, { through: models.ServicesInSC, foreignKey: 'service' })
models.Servicechain.belongsToMany(models.Service, { through: models.ServicesInSC, foreignKey: 'servicechain' })

models.Organization.hasMany(models.Servicechain)
models.Servicechain.belongsTo(models.Organization)

models.Servicechain.hasOne(models.Contact)
models.Contact.belongsTo(models.Servicechain)

models.Servicechain.hasOne(models.Message)
models.Message.belongsTo(models.Servicechain)

models.Blast.hasMany(models.Message)
models.Sequelize = Sequelize;


/**
 * Does the initial database and model sync. Made an explicit function to wrap around `sequelize.sync()` so it isn't called by every process that imports it.
 */
export function initialize_database(): Promise<any> {
    process.env.NODE_ENV == "test" ? console.warn(`Dropping DB? YES, resetting DB because NODE_ENV is 'test'`) : console.info(`Dropping DB? NO, because NODE_ENV is ${process.env.NODE_ENV}`)
    return sequelize.sync({ force: process.env.NODE_ENV == "test" ? true : false })
}