import { syncBuiltinESMExports } from 'module';
import { Sequelize } from 'sequelize/types';
import { errors, Servicechain as ServicechainAttrs, ServicesInSC as ServicesInSCAttrs } from 'voluble-common'
import * as winston from 'winston';

import { ContactManager } from '../contact-manager/'
import * as db from '../models'
import { Service } from '../models/service'
import { Servicechain } from '../models/servicechain'
import { ServicesInSC } from '../models/servicesInServicechain'
import { PluginManager } from '../plugin-manager'

const logger = winston.loggers.get(process.title).child({ module: 'SCMgr' })

export interface ServicePriority {
    service: string
    priority: number
}

/* This is what is returned when constructing a full Servicechain with associated Service IDs.
    Note, it does NOT represent a Sequelize object. */
export interface ResponseServicechain extends ServicechainAttrs {
    services: ServicesInSCAttrs[]
}

export class EmptyServicechainError extends Error { }

/**
 * The ServicechainManager handles all operations that relate to Servicechains and ServiceInServicechains, which includes
 * creating and removing Servicechains, and finding information for a given Servicechain.
 * Like all Voluble Managers, ServicechainManager does not need to be instantiated and can be accessed directly.
 */
export class ServicechainManager {
    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {Number} The ID of the servicechain that we want to retrieve the services for.
     */
    public static getServicesInServicechain(servicechain_id: string): Promise<ServicesInSC[]> {
        return db.models.ServicesInSC.findAll({
            where: {
                servicechainId: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    }

    public static getServicechainFromContactId(contact_id: string): Promise<Servicechain | null> {
        return ContactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.models.Contact.findByPk(cont_id)
            })
            .then(function (contact) {
                return contact.getServicechain()
            })
    }

    public static getAllServicechains(): Promise<Servicechain[]> {
        return db.models.Servicechain.findAll()
    }

    public static getServicechainById(id: string): Promise<Servicechain | null> {
        return db.models.Servicechain.findByPk(id)
    }

    public static async getServiceInServicechainByPriority(sc_id: string, priority: number): Promise<Service> {

        const sc = await db.models.Servicechain.findByPk(sc_id)

        if (!sc) { throw new errors.ResourceNotFoundError(`Servicechain with ID ${sc_id} does not exist`) }

        const svcs = await sc.getServices()

        if (!svcs) { throw new EmptyServicechainError(`Servicechain does not contain a service with priority ${priority}`) }

        return svcs[0]
    }

    public static async getServiceCountInServicechain(sc_id: string): Promise<number> {
        const sc = await db.models.Servicechain.findByPk(sc_id)
        if (sc) {
            const count = await sc.countServices()
            if (count) { return count }
            else { throw new EmptyServicechainError(`No plugins found in servicechain ${sc_id}`) }

        } else {
            throw new errors.ResourceNotFoundError(`No servicechain found with ID ${sc_id}`)
        }
    }

    /**
     * Creates a new Servicechain from the name and service IDs provided. Returns a Promise for the Sequelize object representing the new Servicechain.
     * @param {string} name The name of the new Servicechain
     */
    public static createNewServicechain(name: string): Promise<Servicechain> {
        // First, create the new SC itself
        return db.models.Servicechain.create({
            name: name
        })
    }

    public static addServiceToServicechain(sc_id: string, service_id: string, priority: number): Promise<ServicesInSC> {
        return db.models.ServicesInSC.create({
            servicechain: sc_id,
            service: service_id,
            priority: priority
        })
    }

    public static async addServicesToServicechain(services: ServicePriority[], servicechain: string): Promise<Servicechain> {
        const sc = await ServicechainManager.getServicechainById(servicechain)
        let t = await sc.sequelize.transaction()


        try {
            await Promise.all(services.map(async svc_prio => {
                const svc = await PluginManager.getServiceById(svc_prio.service);
                if (!svc) { throw new errors.ResourceNotFoundError(`Service with ID ${svc_prio.service} could not be found!`); }
                //return new Promise((res, rej) => res())
                return sc.addService(svc_prio.service, {
                    through: {
                        service: svc_prio.service,
                        servicechain: sc.id,
                        priority: svc_prio.priority
                    },
                    transaction: t
                })
            }))

            await t.commit()
        } catch (e) {
            await t.rollback()
            throw e
        }

        await sc.save();
        return sc.reload()

    }

    // public static async removeServicesFromServicechain(sc_id: string, services?: string[]) {
    //     const servicesToRemove: string[] = services ?? (await db.models.ServicesInSC.findAll({ where: { servicechain: sc_id } })).map(svcInSc => svcInSc.service)
    //     db.models.ServicesInSC.sequelize.transaction(t=>{

    //     })

    // }

    public static async getFullServicechain(sc_id: string): Promise<ResponseServicechain> {
        return db.models.Servicechain.findByPk(sc_id
        )
            .then(async (sc) => {
                if (!sc) {
                    throw new errors.ResourceNotFoundError(`Servicechain with ID ${sc_id} not found`)
                }
                const svcs = await sc.getServices()

                const svcs_list: ServicesInSCAttrs[] = svcs.map((svc) => {
                    return {
                        id: svc.ServicesInSC.id,
                        service: svc.id,
                        priority: svc.ServicesInSC.priority,
                        servicechain: sc.id,
                        createdAt: svc.ServicesInSC.createdAt,
                        updatedAt: svc.ServicesInSC.updatedAt
                    }
                })

                const resp: ResponseServicechain = {
                    id: sc.id,
                    name: sc.name,
                    organization: (await sc.getOrganization()).id,
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
    public static deleteServicechain(id: string): Promise<number> {
        return db.models.Servicechain.destroy({ where: { id: id } })
            .then(function (destroyedRowsCount) {
                if (!destroyedRowsCount) {
                    return Promise.reject(new errors.ResourceNotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`))
                } else {
                    return Promise.resolve(destroyedRowsCount)
                }
            })
    }
}
