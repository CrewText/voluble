import * as Promise from "bluebird";
import { PlanTypes } from "voluble-common";
import * as winston from 'winston';

import * as db from '../models';
import { Organization } from "../models/organization";
import { InvalidParameterValueError } from '../voluble-errors';

const logger = winston.loggers.get(process.title).child({ module: 'OrgMgr' })

export class OrgManager {

    /**
     * createNewOrganization
     * @param name Name of the organization to create.
     * @returns the new Organization entry, if it is successfully created.
     */
    public static createNewOrganization(name: string, phone_number: string, plan_type: PlanTypes = PlanTypes.PAYG): Promise<Organization> {
        if (!name) {
            return Promise.reject(new InvalidParameterValueError("An Organization name was not provided."))
        } else if (!phone_number) {
            return Promise.reject(new InvalidParameterValueError("An Organization phone number was not provided."))
        }

        return Organization.create({
            name: name, phone_number: phone_number, plan: plan_type
        })
            .catch(db.models.sequelize.ValidationError, (err) => {
                throw new InvalidParameterValueError(err.message)
            })
    }

    public static getAllOrganizations(): Promise<Organization[]> {
        return db.models.Organization.findAll({ order: [['createdAt', 'DESC']] })
    }

    public static getOrganizationById(id: string): Promise<Organization> {
        return db.models.Organization.findByPk(id)
    }

}