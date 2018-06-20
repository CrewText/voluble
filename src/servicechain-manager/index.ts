const winston = require('winston')
import * as Promise from "bluebird"
let errors = require('common-errors')
import * as db from '../models'
import { ContactManager } from '../contact-manager/'

/**
 * The ServicechainManager handles all operations that relate to Servicechains and ServiceInServicechains, which includes
 * creating and removing Servicechains, and finding information for a given Servicechain.
 * Like all Voluble Managers, ServicechainManager does not need to be instantiated and can be accessed directly.
 */
export namespace ServicechainManager {
    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {Number} The ID of the servicechain that we want to retrieve the services for.
     */
    export function getServicesInServicechain(servicechain_id: number): Promise<db.ServicesInSCInstance[]> {
        return db.models.ServicesInSC.findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    }

    export function getServicechainFromContactId(contact_id: number): Promise<db.ServicechainInstance | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.models.Servicechain.findById(cont_id, {
                    include: [{
                        model: db.models.Contact,
                        where: { id: db.sequelize.col('contact.ServicechainId') }
                    }]
                })
            })
    }

    export function getAllServicechains(): Promise<db.ServicechainInstance[]> {
        return db.models.Servicechain.findAll()
    }

    export function getServicechainById(id: number): Promise<db.ServicechainInstance | null> {
        return db.models.Servicechain.findById(id)
    }

    /**
     * Creates a new Servicechain from the name and service IDs provided. Returns a Promise for the Sequelize object representing the new Servicechain.
     * Services must be in the format: [ [priority_num , service_id] , [ priority_num , service_id ] , ... ]
     * @param {string} name The name of the new Servicechain
     * @param {array} services The list of priority/service doubles to add
     */
    export function createNewServicechain(name: string, services: Array<[number, number]>): Promise<db.ServicechainInstance> {
        winston.debug("Creating new SC - " + name)
        // First, create the new SC itself
        return db.models.Servicechain.create({
            name: name
        })
            // Then add services to it!
            .then(function (sc) {
                winston.debug("Created new SC:")
                winston.debug(sc)
                return Promise.map(services, function (svc: [number, number]) {
                    return ServicechainManager.addServiceToServicechain(sc.id, svc[1], svc[0])
                })
                    .then(function (svcs_in_scs) {
                        return sc
                    })
            })

    }

    export function addServiceToServicechain(sc_id: number, service_id: number, priority: number): Promise<db.ServicesInSCInstance> {
        return db.models.ServicesInSC.create({
            servicechain_id: sc_id,
            service_id: service_id,
            priority: priority
        })
    }

    /**
     * Removes a Servicechain from the database. Returns the ID number of the servicechain removed.
     * @param {Number} id ID number of the Servicechain to remove.
     */
    export function deleteServicechain(id: number): Promise<number> {
        return db.models.Servicechain.destroy({ where: { id: id } })
            .then(function (destroyedRowsCount) {
                if (!destroyedRowsCount) {
                    return Promise.reject(new errors.NotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`))
                } else {
                    return Promise.resolve(destroyedRowsCount)
                }
            })
        // TODO: Update SC DELETE route handler to catch this and drop error to ensure idempotence
    }
}
