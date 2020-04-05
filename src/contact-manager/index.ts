import * as winston from 'winston';
import * as db from '../models';
import { Contact } from "../models/contact";
import { ResourceNotFoundError } from '../voluble-errors';
import { Contact as ContactAttrs } from 'voluble-common';
import { Category } from '../models/category';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ContactMgr' })
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
    export async function createContact(contact: Contact): Promise<Contact> {
        let new_contact = await db.models.Contact.create(contact)

        // if (contact.OrganizationId) {
        //     new_contact.setOrganization(contact.OrganizationId)
        // }

        // if (default_servicechain) {
        //     new_contact.setServicechain(default_servicechain)
        // }

        return await new_contact.reload()
    }

    /**
     * Removes a contact with ID `id` from the database
     * @param {string} id ID of contact to remove
     * @returns {promise} Promise resolving to sequelize confirmation of deleted row
     */

    export async function deleteContactFromDB(id: string): Promise<number> {
        return await db.models.Contact.destroy({
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
    export async function checkContactWithIDExists(id: string): Promise<string> {
        return db.models.Contact.count({ where: { id: id } })
            .then(count => {
                if (count) { return id }
                else { throw new ResourceNotFoundError(`No contact with ID ${id}`) }
            })
    }

    /**
     * Queries the database to retrieve the most recent hundred contacts, with a given offset.
     * @param {Number} offset The amount of values to skip over, before returning the next hundred.
     * @returns {promise} Promise resolving to the most recent hundred  Sequelize rows representing messages.
     */
    export function getContacts(offset: number, limit: number, organization: string): Promise<Contact[]> {
        return db.models.Contact.findAll({
            offset: offset,
            limit: limit,
            order: [
                ['surname', 'ASC'],
                ['first_name', 'ASC']
            ],
            where: {
                organization: organization
            }
        })
    }

    /**
     * Queries the database to retrieve the info for contact with ID `id`
     * @param {string} id Contact ID number
     * @returns { promise} Promise resolving to a Sequelize row representing the given contact
     */
    export function getContactWithId(id: string): Promise<Contact | null> {
        return db.models.Contact.findByPk(id)
    }

    export function getContactFromEmail(email_address: string): Promise<Contact | null> {
        return db.models.Contact.findOne({
            where: {
                email_address: email_address
            }
        })
    }

    export function getContactFromPhone(phone_number: string): Promise<Contact | null> {
        return db.models.Contact.findOne({
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
    export function updateContactDetailsWithId(id: string, updatedDetails: any) {//Promise<[number, CategoryModel[]]> {
        return db.models.Contact.update(updatedDetails,
            {
                where: { id: id }
            })
    }
}

export namespace CategoryManager {
    export class CategoryDoesNotExistError extends Error { }
    export async function getCategoriesInOrg(org_id: string) {
        return db.models.Category.findOne({
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

    export async function getCategoryById(category_id: string): Promise<Category> {
        return db.models.Category.findByPk(category_id)
    }
}