import * as Sequelize from "sequelize";
import * as winston from 'winston';

import { Blast } from "./blast";
import { Category } from './category';
import { Contact } from './contact';
import { Message } from './message';
import { Organization } from './organization';
import { Service } from './service';
import { Servicechain } from './servicechain';
import { ServicesInSC } from "./servicesInServicechain";
import { User } from './user';

const logger = winston.loggers.get(process.mainModule.filename).child({ module: 'DB' })

export const models = {
    Contact: Contact,
    Category: Category,
    Message: Message,
    Service: Service,
    Servicechain: Servicechain,
    ServicesInSC: ServicesInSC,
    Blast: Blast,
    User: User,
    Organization: Organization,
    sequelize: Sequelize
    // [key: string]: any
}

const db_url = (process.env.PATH.includes("/app/.heroku") || process.env.CIRRUS_CI) ? process.env.CLEARDB_DATABASE_URL : "mysql://root@localhost/voluble_test"

if (!db_url) {
    // The ENV var has not been correctly set
    throw new Error("ClearDB Database URL is null! Exiting...")
}

const sequelize = new Sequelize.Sequelize(db_url, {
    dialect: 'mysql',
    // logging: process.env.NODE_ENV == "test" ? (sql, timing) => { logger.debug(sql, { timing: timing }) } : false,
    logging: false,
    logQueryParameters: false
})


User.initModel(sequelize)
Category.initModel(sequelize)
Servicechain.initModel(sequelize)
Service.initModel(sequelize)
Contact.initModel(sequelize)
Message.initModel(sequelize)
ServicesInSC.initModel(sequelize)
Organization.initModel(sequelize)
Blast.initModel(sequelize)

User.belongsTo(Organization, { foreignKey: 'organization', onDelete: 'CASCADE' })
Organization.hasMany(User, { foreignKey: 'organization', as: 'users' })

Contact.belongsTo(Organization, { foreignKey: 'organization', onDelete: 'CASCADE' })
Organization.hasMany(Contact, { foreignKey: 'organization', as: 'contacts' })

Contact.belongsTo(Category, { foreignKey: 'category' })
Category.hasMany(Contact, { foreignKey: 'category', as: 'contacts' })

Contact.belongsTo(Servicechain, { foreignKey: 'servicechain' })
Servicechain.hasOne(Contact, { foreignKey: 'servicechain' })

Message.belongsTo(Contact, { foreignKey: "contact", onDelete: 'CASCADE' })
Contact.hasMany(Message, { foreignKey: "contact", as: 'messages' })

Message.belongsTo(User, { foreignKey: 'user', onDelete: 'CASCADE' })
User.hasMany(Message, { foreignKey: 'user', as: 'messages' })

Message.belongsTo(Servicechain, { foreignKey: 'servicechain' })
Servicechain.hasOne(Message, { foreignKey: 'servicechain' })

Category.belongsTo(Organization, { foreignKey: 'organization', onDelete: 'CASCADE' })
Organization.hasMany(Category, { foreignKey: 'organization', as: 'categories' })

Service.belongsToMany(Servicechain, { through: ServicesInSC, foreignKey: 'service' })
// ServicechainModel.hasMany(ServiceModel, { foreignKey: 'servicechain' })//, as: 'services' })
Servicechain.belongsToMany(Service, { through: ServicesInSC, foreignKey: 'servicechain' })//, as: 'services' })

Servicechain.belongsTo(Organization, { foreignKey: 'organization', onDelete: 'CASCADE' })
Organization.hasMany(Servicechain, { foreignKey: 'organization', as: 'servicechains' })

Blast.hasMany(Message, { foreignKey: 'blast', as: 'messages' })
// models.Sequelize = Sequelize;


/**
 * Does the initial database and model sync. Made an explicit function to wrap around `sequelize.sync()` so it isn't called by every process that imports it.
 */
export function initialize_database() {
    process.env.NODE_ENV == "test" ? logger.warn(`Dropping DB? YES, resetting DB because NODE_ENV is 'test'`) : logger.info(`Dropping DB? NO, because NODE_ENV is ${process.env.NODE_ENV}`)
    return sequelize.sync({ force: process.env.NODE_ENV == "test", alter: process.env.NODE_ENV == "test" })
}