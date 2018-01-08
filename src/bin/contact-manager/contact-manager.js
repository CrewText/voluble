const winston = require('winston')
const Promise = require('bluebird')
const db = require('../../models')

/**
 * The ContactManager is responsible for handling all contact-related operations, including creating new Contacts in the DB,
 * removing Contacts and finding information about Contacts.
 */
var ContactManager = {
    /**
     * Adds a new Contact to the database with specified details. All Contacts must have these details as a minimum.
     * @param {string} first_name The first name of the new Contact.
     * @param {string} surname The surname of the new Contact.
     * @param {string} email The email address of the new Contact.
     * @param {string} phone_num The phone number (with leading country code) of the contact
     * @param {Number} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
     */
    createContact: function (first_name, surname, email, phone_num, default_servicechain) {

        return db.sequelize.model('Contact').create({
            first_name: first_name,
            surname: surname,
            email_address: email,
            phone_number: phone_num,
            default_servicechain: default_servicechain
        })
    },

    /**
     * Removes a contact with ID `id` from the database
     * @param {Number} id ID of contact to remove
     * @returns {promise} Promise resolving to sequelize confirmation of deleted row
     */

    deleteContactFromDB: function (id) {
        return db.sequelize.model('Contact').destroy({
            where: {
                id: id
            }
        })
    },

    /**
     * Queries the database to make sure confirm that the contact with id `id` exists
     * @param {Number} id Contact ID number
     * @returns {promise} Promise resolving to the id of the contact, if it exists.
     */
    checkContactWithIDExists: function (id) {
        return new Promise(function (resolve, reject) {
            /* Do a COUNT of all of the contacts in the DB with this ID. If it doesn't exist (i.e. COUNT = 0,)
             * throw an error.
             */
            return db.sequelize.model('Contact').count({ where: { id: id } })
                .then(function (count) {
                    if (count == "0") {
                        reject(new Error("No contact with ID " + id))
                    } else {
                        // Contact exists, return the same ID what was provided, for Promise continuity
                        resolve(id)
                    }
                })
        })
    },

    /**
     * Queries the database to retrieve the most recent hundred contacts, with a given offset.
     * @param {Number} offset The amount of values to skip over, before returning the next hundred.
     * @returns {promise} Promise resolving to the most recent hundred  Sequelize rows representing messages.
     */
    getHundredContacts: function (offset) {
        return db.sequelize.model('Contact').findAll({
            offset: offset, limit: 100
        })
    },

    /**
     * Queries the database to retrieve the info for contact with ID `id`
     * @param {Number} id Contact ID number
     * @returns {promise} Promise resolving to a Sequelize row representing the given contact
     */
    getContactWithId: function (id) {
        return db.sequelize.model('Contact').findOne({
            where: {
                id: id // TODO: Validate contact exists
            }
        })

    },

    /**
     * Updates the details of a single Contact.
     * @param {Number} id ID of the Contact whose details will be updated
     * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g `{first_name: 'Adam', surname: 'Smith'}`. These parameter names must match the database field names.
     * @returns {promise} Promise resolving to a sequelize confirmation of the updated row.
     */
    updateContactDetailsWithId: function (id, updatedDetails) {
        return db.sequelize.model('Contact').update(updatedDetails,
            {
                where: { id: id }
            })
    }
}

module.exports = ContactManager