import { Contact as ContactAttrs, errors } from "voluble-common";

import * as db from '../models';
import { Category } from '../models/category';
import { Contact } from "../models/contact";

//const logger = winston.loggers.get(process.title).child({ module: 'ContactMgr' })

/**
 * The ContactManager is responsible for handling all contact-related operations, including creating new Contacts in the DB,
 * removing Contacts and finding information about Contacts.
 */
export class ContactManager {
    /**
     * Adds a new Contact to the database with specified details. All Contacts must have these details as a minimum.
     * @param {string} first_name The first name of the new Contact.
     * @param {string} surname The surname of the new Contact.
     * @param {string} email The email address of the new Contact.
     * @param {string} phone_num The phone number (with leading country code) of the contact
     * @param {string} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
     */
    public static async createContact(contact: Contact): Promise<Contact> {
        const new_contact = await db.models.Contact.create(contact)

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

    public static async deleteContactFromDB(id: string): Promise<number> {
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
    public static async checkContactWithIDExists(id: string): Promise<string> {
        return db.models.Contact.count({ where: { id: id } })
            .then(count => {
                if (count) { return id }
                else { throw new errors.ResourceNotFoundError(`No contact with ID ${id}`) }
            })
    }

    /**
     * Queries the database to retrieve the most recent hundred contacts, with a given offset.
     * @param {Number} offset The amount of values to skip over, before returning the next hundred.
     * @returns {promise} Promise resolving to the most recent hundred  Sequelize rows representing messages.
     */
    public static getContacts(offset: number, limit: number, organization: string): Promise<Contact[]> {
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
    public static getContactWithId(id: string): Promise<Contact | null> {
        return db.models.Contact.findByPk(id)
    }

    public static getContactFromEmail(email_address: string): Promise<Contact | null> {
        return db.models.Contact.findOne({
            where: {
                email_address: email_address
            }
        })
    }

    public static getContactFromPhone(phone_number: string): Promise<Contact | null> {
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
    public static updateContactDetailsWithId(id: string, updatedDetails: Partial<ContactAttrs>): Promise<[number, Contact[]]> {
        return db.models.Contact.update(updatedDetails,
            {
                where: { id: id }
            })
    }
}


export class CategoryDoesNotExistError extends Error { }

export class CategoryManager {

    public static async getCategoriesInOrg(org_id: string): Promise<Category> {
        return db.models.Category.findOne({
            where:
            {
                OrganizationId: org_id
            }
        })
    }

    public static async createCategory(category_name: string): Promise<Category> {
        return db.models.Category.create({
            name: category_name
        })
    }

    public static async deleteCategory(category_id: string): Promise<void> {
        const cat = await db.models.Category.findByPk(category_id)
        if (!cat) {
            throw new errors.ResourceNotFoundError(`The Category with ID ${category_id} does not exist`)
        }

        await cat.destroy()
    }

    public static async getCategoryById(category_id: string): Promise<Category> {
        return db.models.Category.findByPk(category_id)
    }
}