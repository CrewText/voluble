//import * as Promise from "bluebird";
import { errors, Org, PlanTypes } from "voluble-common";

import * as db from '../models';
import { Organization } from "../models/organization";


//const logger = winston.loggers.get(process.title).child({ module: 'OrgMgr' })

export class OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    public static createNewOrganization(name: string, phone_number: string, plan_type: PlanTypes = PlanTypes.PAYG): Promise<Organization> {
        if (!name) {
            return Promise.reject(new errors.InvalidParameterValueError("An Organization name was not provided."))
        } else if (!phone_number) {
            return Promise.reject(new errors.InvalidParameterValueError("An Organization phone number was not provided."))
        }

        return Organization.create({
            name: name, phone_number: phone_number, plan: plan_type
        })
            .catch(err => {
                if (err instanceof db.models.sequelize.ValidationError) {
                    throw new errors.InvalidParameterValueError(err.message)
                } else { throw err }
            })
    }

    public static getAllOrganizations(): Promise<Organization[]> {
        return db.models.Organization.findAll({ order: [['createdAt', 'DESC']] })
    }

    public static getOrganizationById(id: string): Promise<Organization> {
        return db.models.Organization.findByPk(id)
    }

    public static updateOrganizationWithId(id: string, updates: Partial<Org>): Promise<[number, Organization[]]> {
        return db.models.Organization.update(updates, {
            where: { id: id }
        })
    }

}