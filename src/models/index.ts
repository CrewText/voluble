import * as Sequelize from "sequelize"
import * as path from "path"
const basename = path.basename(__filename);
import * as fs from "fs"
import * as Promise from 'bluebird'
const winston = require('winston')

import * as Contact from './contact'
import * as Message from './message'
import * as Service from './service'
import * as Servicechain from './servicechain'
import * as ServiceInSC from './servicesInServicechain'
import * as Blast from './blast'
import * as User from './user'
import * as Organization from './organization'

export type ContactInstance = Contact.ContactInstance
export type MessageInstance = Message.MessageInstance
export type ServiceInstance = Service.ServiceInstance
export type ServicechainInstance = Servicechain.ServicechainInstance
export type ServicesInSCInstance = ServiceInSC.ServicesInSCInstance
export type BlastInstance = Blast.BlastInstance
export type OrganizationInstance = Organization.OrgInstance
export type UserInstance = User.UserInstance

export interface DbConnection {
    Contact: Sequelize.Model<Contact.ContactInstance, Contact.ContactAttributes>,
    Message: Sequelize.Model<Message.MessageInstance, Message.MessageAttributes>,
    Service: Sequelize.Model<Service.ServiceInstance, Service.ServiceAttributes>,
    Servicechain: Sequelize.Model<Servicechain.ServicechainInstance, Servicechain.ServicechainAttributes>,
    ServicesInSC: Sequelize.Model<ServiceInSC.ServicesInSCInstance, ServiceInSC.ServicesInSCAttributes>,
    Blast: Sequelize.Model<Blast.BlastInstance, Blast.BlastAttributes>,
    User: Sequelize.Model<User.UserInstance, User.UserAttributes>
    Organization: Sequelize.Model<Organization.OrgInstance, Organization.OrgAttributes>
    [key: string]: any
}


//@ts-ignore
export var models: DbConnection = {}
let db_url: string
if (process.env.NODE_ENV == "development") {
    db_url = "mysql://root@localhost/voluble_dev"
    winston.debug("DB: Using localhost dev database")
} else if (process.env.NODE_ENV == "test") {
    db_url = "mysql://root@localhost/voluble_test"
    winston.debug("DB: Using localhost test database")
} else {
    db_url = process.env.CLEARDB_DATABASE_URL
    winston.debug("DB: Using ClearDB database")
}
//export var sequelize = new Sequelize(db_url, { dialect: 'mysql', logging: process.env.NODE_ENV == "production" ? false : true })
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

models.User.belongsTo(models.Contact)

models.Service.belongsToMany(models.Servicechain, { through: models.ServicesInSC })
models.Servicechain.belongsToMany(models.Service, { through: models.ServicesInSC })

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
    if (process.env.NODE_ENV == "test") {
        console.log("Dropping DB")
        return sequelize.sync({ force: true })
    }
    return sequelize.sync()
}