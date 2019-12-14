import * as Promise from "bluebird";
import * as winston from 'winston';
import * as db from '../models';
import { InvalidParameterValueError } from '../voluble-errors'

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'OrgMgr' })

export namespace OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    export function createNewOrganization(name: string, phone_number: string): Promise<db.OrganizationInstance> {
        if (!name) {
            return Promise.reject(new InvalidParameterValueError("An Organization name was not provided."))
        } else if (!phone_number) {
            return Promise.reject(new InvalidParameterValueError("An Organization phone number was not provided."))
        }
        return db.models.Organization.create({
            name: name, phone_number: phone_number
        })
            .catch(db.sequelize.ValidationError, (err) => {
                throw new InvalidParameterValueError(err.message)
            })
    }

    export function getAllOrganizations(): Promise<db.OrganizationInstance[]> {
        return db.models.Organization.findAll({ order: [['createdAt', 'DESC']] })
    }

    export function getOrganizationById(id: string): Promise<db.OrganizationInstance> {
        return db.models.Organization.findByPk(id)
    }

}