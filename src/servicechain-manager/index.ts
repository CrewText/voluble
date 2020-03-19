import { Servicechain as ServicechainAttrs, ServicesInSC as ServicesInSCAttrs } from 'voluble-common'
import * as winston from 'winston'
import { ContactManager } from '../contact-manager/'
import * as db from '../models'
import { Service } from '../models/service'
import { Servicechain } from '../models/servicechain'
import { ServicesInSC } from '../models/servicesInServicechain'
import { ResourceNotFoundError } from '../voluble-errors'

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'SCMgr' })

/**
 * The ServicechainManager handles all operations that relate to Servicechains and ServiceInServicechains, which includes
 * creating and removing Servicechains, and finding information for a given Servicechain.
 * Like all Voluble Managers, ServicechainManager does not need to be instantiated and can be accessed directly.
 */
export namespace ServicechainManager {

    export interface ServicePriority {
        service: string
        priority: number
    }

    /* This is what is returned when constructing a full Servicechain with associated Service IDs.
    Note, it does NOT represent a Sequelize object. */
    export interface ResponseServicechain extends ServicechainAttrs {
        services: ServicesInSCAttrs[]
    }

    // export class ResourceNotFoundError extends Error { }
    export class EmptyServicechainError extends Error { }

    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {Number} The ID of the servicechain that we want to retrieve the services for.
     */
    export function getServicesInServicechain(servicechain_id: string): Promise<ServicesInSC[]> {
        return db.models.ServicesInSC.findAll({
            where: {
                servicechainId: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    }

    export function getServicechainFromContactId(contact_id: string): Promise<Servicechain | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.models.Contact.findByPk(cont_id)
            })
            .then(function (contact) {
                return contact.getServicechain()
            })
    }

    export function getAllServicechains(): Promise<Servicechain[]> {
        return db.models.Servicechain.findAll()
    }

    export function getServicechainById(id: string): Promise<Servicechain | null> {
        return db.models.Servicechain.findByPk(id)
    }

    export async function getServiceInServicechainByPriority(sc_id: string, priority: number): Promise<Service> {

        let sc = await db.models.Servicechain.findByPk(sc_id)

        if (!sc) { throw new ResourceNotFoundError(`Servicechain with ID ${sc_id} does not exist`) }

        let svcs = await sc.getServices()

        if (!svcs) { throw new EmptyServicechainError(`Servicechain does not contain a service with priority ${priority}`) }

        return svcs[0]
    }

    export async function getServiceCountInServicechain(sc_id: string): Promise<number> {
        let sc = await db.models.Servicechain.findByPk(sc_id)
        if (sc) {
            let count = await sc.countServices()
            if (count) { return count }
            else { throw new EmptyServicechainError(`No plugins found in servicechain ${sc_id}`) }

        } else {
            throw new ResourceNotFoundError(`No servicechain found with ID ${sc_id}`)
        }
    }

    /**
     * Creates a new Servicechain from the name and service IDs provided. Returns a Promise for the Sequelize object representing the new Servicechain.
     * @param {string} name The name of the new Servicechain
     */
    export function createNewServicechain(name: string): Promise<Servicechain> {
        // First, create the new SC itself
        return db.models.Servicechain.create({
            name: name
        })
    }

    export function addServiceToServicechain(sc_id: string, service_id: string, priority: number): Promise<ServicesInSC> {
        return db.models.ServicesInSC.create({
            servicechain: sc_id,
            service: service_id,
            priority: priority
        })
    }

    export async function getFullServicechain(sc_id: string) {
        return db.models.Servicechain.findByPk(sc_id
        )
            .then(async (sc) => {
                if (!sc) {
                    throw new ResourceNotFoundError(`Servicechain with ID ${sc_id} not found`)
                }
                let svcs = await sc.getServices()

                let svcs_list: ServicesInSCAttrs[] = svcs.map((svc) => {
                    return {
                        id: svc.ServicesInSC.id,
                        service: svc.id,
                        priority: svc.ServicesInSC.priority,
                        servicechain: sc.id,
                        createdAt: svc.ServicesInSC.createdAt,
                        updatedAt: svc.ServicesInSC.updatedAt
                    }
                })

                let resp: ResponseServicechain = {
                    id: sc.id,
                    name: sc.name,
                    OrganizationId: (await sc.getOrganization()).id,
                    services: svcs_list,
                    updatedAt: sc.updatedAt,
                    createdAt: sc.createdAt
                }
                return resp
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
                    return Promise.reject(new ResourceNotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`))
                } else {
                    return Promise.resolve(destroyedRowsCount)
                }
            })
        // TODO: Update SC DELETE route handler to catch this and drop error to ensure idempotence
    }
}
