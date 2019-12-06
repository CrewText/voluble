const winston = require('winston')
import * as BBPromise from "bluebird"
import { ContactInstance } from "../models/contact";
import { MessageManager } from '../message-manager'
import * as db from '../models'
import { OrgManager } from "../org-manager";
const errs = require('common-errors')

/**
 * The ContactManager is responsible for handling all contact-related operations, including creating new Contacts in the DB,
 * removing Contacts and finding information about Contacts.
 */
export namespace ContactManager {
    /**
     * Adds a new Contact to the database with specified details. All Contacts must have these details as a minimum.
     * @param {string} first_name The first name of the new Contact.
     * @param {string} surname The surname of the new Contact.
     * @param {string} email The email address of the new Contact.
     * @param {string} phone_num The phone number (with leading country code) of the contact
     * @param {string} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
     */
    export function createContact(title: string, first_name: string, surname: string, email: string, phone_num: string, default_servicechain: string, org_id?: string): BBPromise<ContactInstance> {
        return db.models.Contact.create({
            title: title,
            first_name: first_name,
            surname: surname,
            email_address: email,
            phone_number: phone_num,
        })
            .then((contact) => {
                if (org_id) {
                    return contact.setOrganization(org_id)
                        .then(() => {
                            return contact
                        })
                } else { return contact }
            })
            .then((contact) => {
                if (default_servicechain) {
                    return contact.setServicechain(default_servicechain)
                        .then(() => {
                            return contact
                        })
                } else { return contact }
            })
    }

    /**
     * Removes a contact with ID `id` from the database
     * @param {string} id ID of contact to remove
     * @returns {promise} Promise resolving to sequelize confirmation of deleted row
     */

    export function deleteContactFromDB(id: string): BBPromise<number> {
        return db.models.Contact.destroy({
            where: {
                id: id
            }
        })
    }

    /**
     * Queries the database to make sure confirm that the contact with id `id` exists
     * @param {string} id Contact ID number
     * @returns {promise} Promise resolving to the id of the contact, if it exists.
     */
    export function checkContactWithIDExists(id: string): BBPromise<string> {
        return BBPromise.try(function () {
            /* Do a COUNT of all of the contacts in the DB with this ID. If it doesn't exist (i.e. COUNT = 0,)
             * throw an error.
             */
            return db.models.Contact.count({ where: { id: id } })
                .then(function (count: number) {
                    if (!count) {
                        return BBPromise.reject(errs.NotFoundError(`No contact with ID ${id}`))
                    } else {
                        // Contact exists, return the same ID what was provided, for Promise continuity
                        return BBPromise.resolve(id)
                    }
                })
        })
    }

    /**
     * Queries the database to retrieve the most recent hundred contacts, with a given offset.
     * @param {Number} offset The amount of values to skip over, before returning the next hundred.
     * @returns {promise} Promise resolving to the most recent hundred  Sequelize rows representing messages.
     */
    export function getHundredContacts(offset: number, organization: string): BBPromise<ContactInstance[]> {
        return db.models.Contact.findAll({
            offset: offset,
            limit: 100,
            order: [
                ['surname', 'ASC'],
                ['first_name', 'ASC']
            ],
            where: {
                OrganizationId: organization
            }
        })
    }

    /**
     * Queries the database to retrieve the info for contact with ID `id`
     * @param {string} id Contact ID number
     * @returns { promise} Promise resolving to a Sequelize row representing the given contact
     */
    export function getContactWithId(id: string): BBPromise<ContactInstance | null> {
        return db.models.Contact.findById(id)
    }

    export function getContactFromEmail(email_address: string): BBPromise<ContactInstance | null> {
        return db.models.Contact.find({
            where: {
                email_address: email_address
            }
        })
    }

    export function getContactFromPhone(phone_number: string): BBPromise<ContactInstance | null> {
        return db.models.Contact.find({
            where: {
                phone_number: phone_number
            }
        })
    }

    /**
     * Updates the details of a single Contact.
     * @param {string} id ID of the Contact whose details will be updated
     * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g `{first_name: 'Adam', surname: 'Smith'}`. These parameter names must match the database field names.
     * @returns {promise} Promise resolving to a sequelize confirmation of the updated row.
     */
    export function updateContactDetailsWithId(id: string, updatedDetails: any): BBPromise<[number, db.ContactInstance[]]> {
        return db.models.Contact.update(updatedDetails,
            {
                where: { id: id }
            })
    }
}

export namespace CategoryManager {
    export class CategoryDoesNotExistError extends Error { }
    export async function getCategoriesInOrg(org_id: string) {
        return db.models.Category.find({
            where:
            {
                OrganizationId: org_id
            }
        })
    }

    export async function createCategory(category_name: string) {
        return db.models.Category.create({
            name: category_name
        })
    }

    export async function deleteCategory(category_id: string) {
        let cat = await db.models.Category.findByPk(category_id)
        if (!cat) {
            throw new CategoryDoesNotExistError(`The Category with ID ${category_id} does not exist`)
        }

        await cat.destroy()
    }

    export async function getCategoryById(category_id: string): Promise<db.CategoryInstance> {
        return db.models.Category.findByPk(category_id)
    }
}