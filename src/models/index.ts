import * as Sequelize from "sequelize"
import * as path from "path"
const basename = path.basename(__filename);
import * as fs from "fs"
const winston = require('winston')

import * as Contact from './contact'
import * as Message from './message'
import * as Plugin from './plugin'
import * as Servicechain from './servicechain'
import * as ServiceInSC from './servicesInServicechain'
import * as Blast from './blast'
import * as User from './user'

export interface DbConnection {
    Contact: Sequelize.Model<Contact.ContactInstance, Contact.ContactAttributes>,
    Message: Sequelize.Model<Message.MessageInstance, Message.MessageAttributes>,
    Plugin: Sequelize.Model<Plugin.PluginInstance, Plugin.PluginAttributes>,
    Servicechain: Sequelize.Model<Servicechain.ServicechainInstance, Servicechain.ServicechainAttributes>,
    ServicesInSC: Sequelize.Model<ServiceInSC.ServicesInSCInstance, ServiceInSC.ServicesInSCAttributes>,
    Blast: Sequelize.Model<Blast.BlastInstance, Blast.BlastAttributes>,
    User: Sequelize.Model<User.UserInstance, User.UserAttributes>
    [key: string]: any
}

var db: any = {}
var sequelize = new Sequelize(process.env.JAWSDB_MARIA_URL || "localhost", { dialect: 'mysql' })

// TODO: #5 Set up associations between models, reduce the need for validation

fs
    .readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        var model = sequelize['import'](path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

sequelize.sync()

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default <DbConnection>db