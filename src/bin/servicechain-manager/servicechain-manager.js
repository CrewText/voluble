const db = require('../../models')
const contactManager = require('../contact-manager/contact-manager')
const winston = require('winston')
const Promise = require('bluebird')
import * as errors from "node-common-errors"

/**
 * The ServicechainManager handles all operations that relate to Servicechains and ServiceInServicechains, which includes
 * creating and removing Servicechains, and finding information for a given Servicechain.
 * Like all Voluble Managers, ServicechainManager does not need to be instantiated and can be accessed directly.
 */
var ServicechainManager = {
    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {Number} The ID of the servicechain that we want to retrieve the services for.
     */
    getServicesInServicechain: function (servicechain_id) {
        return db.sequelize.model('ServicesInSC').findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    },

    getServicechainFromContactId: function (contact_id) {
        return contactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.sequelize.model('Contact').findOne({
                    where: { id: cont_id },
                    attributes: ['default_servicechain']
                })
            })
            .then(function (contact_svc) {
                return db.sequelize.model('Servicechain').findOne({
                    where: {
                        id: contact_svc.default_servicechain
                    }
                })
            })
    },

    getAllServicechains: function () {
        return db.sequelize.model('Servicechain').findAll()
    },

    getServicechainById: function (id) {
        return db.sequelize.model('Servicechain').findOne(
            { where: { id: id } } // TODO: Validate me!
        )
    },

    /**
     * Creates a new Servicechain from the name and service IDs provided. Returns a Promise for the Sequelize object representing the new Servicechain.
     * Services must be in the format: [ [priority_num , service_id] , [ priority_num , service_id ] , ... ]
     * @param {string} name The name of the new Servicechain
     * @param {array} services The list of priority/service doubles to add
     */
    createNewServicechain: function (name, services) {
        winston.debug("Creating new SC - " + name)
        // First, create the new SC itself
        return db.Servicechain.create({
            name: name
        })
        // Then add services to it!
        .then(function(sc){
            winston.debug("Created new SC:")
            winston.debug(sc)
            return Promise.map(services, function(svc){
                return ServicechainManager.addServiceToServicechain(sc.id, svc[1], svc[0])
            })
            .then(function(svcs_in_scs){
                return sc
            })
        })

    },


    addServiceToServicechain: function (sc_id, service_id, priority) {
        return db.ServicesInSC.create({
            servicechain_id: sc_id,
            service_id: service_id,
            priority: priority
        })
    },

    /**
     * Removes a Servicechain from the database. Returns the ID number of the servicechain removed.
     * @param {Number} id ID number of the Servicechain to remove.
     */
    deleteServicechain: function (id) {
        return db.Servicechain.destroy({ where: { id: id } })
        .then(function(destroyedRowsCount){
            if (destroyedRowsCount == 0){
                return Promise.reject(new errors.NotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`))
            } else {
                return destroyedRowsCount
            }
        }) // TODO: Update SC DELETE route handler to catch this and drop error to ensure idempotence
    }
}

module.exports = ServicechainManager