const winston = require('winston')
import * as Promise from "bluebird";
import * as db from '../models';
const errs = require('common-errors')

export namespace OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    export function createNewOrganization(name: string, phone_number: string): Promise<db.OrganizationInstance> {
        if (!name) {
            return Promise.reject(new errs.ArgumentNullError("An Organization name was not provided."))
        } else if (!phone_number) {
            return Promise.reject(new errs.ArgumentNullError("An Organization phone number was not provided."))
        }
        return db.models.Organization.create({
            name: name, phone_number: phone_number
        })
            .catch(db.sequelize.ValidationError, (err) => {
                throw new errs.ValidationError(err)
            })
    }

    export function getAllOrganizations(): Promise<db.OrganizationInstance[]> {
        return db.models.Organization.findAll()
    }

    export function getOrganizationById(id: string): Promise<db.OrganizationInstance> {
        return db.models.Organization.findById(id)
    }

}