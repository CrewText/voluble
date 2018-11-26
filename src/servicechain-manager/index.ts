const winston = require('winston')
import * as Promise from "bluebird"
let errs = require('common-errors')
import * as db from '../models'
import { ContactManager } from '../contact-manager/'

/**
 * The ServicechainManager handles all operations that relate to Servicechains and ServiceInServicechains, which includes
 * creating and removing Servicechains, and finding information for a given Servicechain.
 * Like all Voluble Managers, ServicechainManager does not need to be instantiated and can be accessed directly.
 */
export namespace ServicechainManager {

    interface ServicechainPriority {
        service_id: string,
        priority: number
    }

    export const EmptyServicechainError = errs.helpers.generateClass('EmptyServicechainError')

    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {Number} The ID of the servicechain that we want to retrieve the services for.
     */
    export function getServicesInServicechain(servicechain_id: string): Promise<db.ServicesInSCInstance[]> {
        return db.models.ServicesInSC.findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    }

    export function getServicechainFromContactId(contact_id: string): Promise<db.ServicechainInstance | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.models.Servicechain.findOne({
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

    export function getServicechainById(id: string): Promise<db.ServicechainInstance | null> {
        return db.models.Servicechain.findById(id)
    }

    export function getServiceInServicechainByPriority(sc_id: string, priority: number): Promise<db.ServiceInstance | null> {
        return db.models.Servicechain.findById(sc_id, {
            include: [
                {
                    model: db.models.Service,
                    through: {
                        where: {
                            priority: priority
                        }
                    }
                }
            ]
        }).then(function (sc) {
            if (sc) {
                //@ts-ignore
                if (sc.Services.length) {
                    //@ts-ignore
                    let sc_to_ret: db.ServiceInstance = sc.Services[0]
                    return Promise.resolve(sc_to_ret)
                } else {
                    return Promise.reject(new EmptyServicechainError(`Servicechain does not contain a service with priority ${priority}`))
                }
            } else {
                return Promise.reject(new errs.NotFoundError(`Servicechain with ID ${sc_id} does not exist`))
            }
        })
    }

    export function getServiceCountInServicechain(sc_id: string): Promise<number> {
        return db.models.Servicechain.findById(sc_id)
            .then(function (sc) {
                if (sc) {
                    //@ts-ignore
                    return sc.getServices()
                        .then(function (svcs: db.ServiceInstance[]) {
                            if (svcs) {
                                return svcs.length
                            } else {
                                return Promise.reject(errs.NotFoundError(`No plugins found in servicechain ${sc_id}`))
                            }
                        })
                } else {
                    return Promise.reject(errs.NotFoundError(`No servicechain found with ID ${sc_id}`))
                }
            })
    }

    /**
     * Creates a new Servicechain from the name and service IDs provided. Returns a Promise for the Sequelize object representing the new Servicechain.
     * Services must be in the format: [ [priority_num , service_id] , [ priority_num , service_id ] , ... ]
     * @param {string} name The name of the new Servicechain
     * @param {array} services The list of priority/service doubles to add
     */
    export function createNewServicechain(name: string): Promise<db.ServicechainInstance> {
        winston.debug("SCM: Creating new SC - " + name)
        // First, create the new SC itself
        return db.models.Servicechain.create({
            name: name
        })
        // // Then add services to it!
        // .then(function (sc) {
        //     winston.debug("Created new SC:")
        //     winston.debug(sc)
        //     return Promise.map(services, function (scp: ServicechainPriority) {
        //         return ServicechainManager.addServiceToServicechain(sc.id, scp.service_id, scp.priority)
        //     })
        //         .then(function (svcs_in_scs) {
        //             return sc
        //         })
        // })

    }

    export function addServiceToServicechain(sc_id: string, service_id: string, priority: number): Promise<db.ServicesInSCInstance> {
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
    export function deleteServicechain(id: string): Promise<number> {
        return db.models.Servicechain.destroy({ where: { id: id } })
            .then(function (destroyedRowsCount) {
                if (!destroyedRowsCount) {
                    return Promise.reject(new errs.NotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`))
                } else {
                    return Promise.resolve(destroyedRowsCount)
                }
            })
        // TODO: Update SC DELETE route handler to catch this and drop error to ensure idempotence
    }
}
