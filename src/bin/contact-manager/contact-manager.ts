const winston = require('winston')
import * as Promise from "bluebird"
import { ContactInstance } from "../../models/contact";
import db from '../../models'

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
     * @param {Number} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
     */
    export function createContact (first_name: string, surname: string, email: string, phone_num: string, default_servicechain: number): Promise<ContactInstance> {
        return db.Contact.create({
            first_name: first_name,
            surname: surname,
            email_address: email,
            phone_number: phone_num,
            default_servicechain: default_servicechain
        })
    }

    /**
     * Removes a contact with ID `id` from the database
     * @param {Number} id ID of contact to remove
     * @returns {promise} Promise resolving to sequelize confirmation of deleted row
     */

    export function deleteContactFromDB (id: number): Promise<number> {
        return db.Contact.destroy({
            where: {
                id: id
            }
        })
    }

    /**
     * Queries the database to make sure confirm that the contact with id `id` exists
     * @param {Number} id Contact ID number
     * @returns {promise} Promise resolving to the id of the contact, if it exists.
     */
    export function checkContactWithIDExists (id: number): Promise<number> {
        return Promise.try(function () {
            /* Do a COUNT of all of the contacts in the DB with this ID. If it doesn't exist (i.e. COUNT = 0,)
             * throw an error.
             */
            return db.Contact.count({ where: { id: id } })
                .then(function (count: number) {
                    if (count == 0) {
                        return Promise.reject(`No contact with ID ${id}`)
                    } else {
                        // Contact exists, return the same ID what was provided, for Promise continuity
                        return Promise.resolve(id)
                    }
                })
        })
    }

    /**
     * Queries the database to retrieve the most recent hundred contacts, with a given offset.
     * @param {Number} offset The amount of values to skip over, before returning the next hundred.
     * @returns {promise} Promise resolving to the most recent hundred  Sequelize rows representing messages.
     */
    export function getHundredContacts (offset: number):Promise<ContactInstance[]> {
        return db.Contact.findAll({
            offset: offset, limit: 100
        })
    }

    /**
     * Queries the database to retrieve the info for contact with ID `id`
     * @param {Number} id Contact ID number
     * @returns { promise} Promise resolving to a Sequelize row representing the given contact
     */
    export function getContactWithId (id: number): Promise<ContactInstance> {
        return db.Contact.findOne({
            where: {
                id: id // TODO: Validate contact exists
            }
        })

    }

    /**
     * Updates the details of a single Contact.
     * @param {Number} id ID of the Contact whose details will be updated
     * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g `{first_name: 'Adam', surname: 'Smith'}`. These parameter names must match the database field names.
     * @returns {promise} Promise resolving to a sequelize confirmation of the updated row.
     */
    export function updateContactDetailsWithId (id: number, updatedDetails: any): Promise<[[Number, any]]> {
        return db.Contact.update(updatedDetails,
            {
                where: { id: id }
            })
    }
}