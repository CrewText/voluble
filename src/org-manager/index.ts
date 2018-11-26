const winston = require('winston')
import * as Promise from "bluebird"
import * as db from '../models'

export namespace OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    export function createNewOrganization(name: string, auth0_id: string): Promise<db.OrganizationInstance> {
        return db.models.Organization.create({
            name: name,
            auth0_id: auth0_id
        })
    }

}