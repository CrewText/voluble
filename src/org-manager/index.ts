const winston = require('winston')
import * as Promise from "bluebird"
import * as db from '../models'

export namespace OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    export function createNewOrganization(name: string): Promise<db.OrganizationInstance> {
        return db.models.Organization.create({
            name: name
        })
    }

    export function getAllOrganizations(): Promise<db.OrganizationInstance[]> {
        return db.models.Organization.findAll()
        // TODO: Add user validation
    }

    export function getOrganizationById(id: string): Promise<db.OrganizationInstance> {
        return db.models.Organization.findById(id)
    }

}