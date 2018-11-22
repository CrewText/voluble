"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require('winston');
const Promise = require("bluebird");
const db = require("../models");
const errs = require('common-errors');
var ContactManager;
(function (ContactManager) {
    function createContact(first_name, surname, email, phone_num, default_servicechain) {
        return db.models.Contact.create({
            first_name: first_name,
            surname: surname,
            email_address: email,
            phone_number: phone_num,
            defaultServicechainId: default_servicechain
        });
    }
    ContactManager.createContact = createContact;
    function deleteContactFromDB(id) {
        return db.models.Contact.destroy({
            where: {
                id: id
            }
        });
    }
    ContactManager.deleteContactFromDB = deleteContactFromDB;
    function checkContactWithIDExists(id) {
        return Promise.try(function () {
            return db.models.Contact.count({ where: { id: id } })
                .then(function (count) {
                if (count == 0) {
                    return Promise.reject(errs.NotFoundError(`No contact with ID ${id}`));
                }
                else {
                    return Promise.resolve(id);
                }
            });
        });
    }
    ContactManager.checkContactWithIDExists = checkContactWithIDExists;
    function getHundredContacts(offset) {
        return db.models.Contact.findAll({
            offset: offset, limit: 100
        });
    }
    ContactManager.getHundredContacts = getHundredContacts;
    function getContactWithId(id) {
        return db.models.Contact.findById(id);
    }
    ContactManager.getContactWithId = getContactWithId;
    function getContactFromEmail(email_address) {
        return db.models.Contact.find({
            where: {
                email_address: email_address
            }
        });
    }
    ContactManager.getContactFromEmail = getContactFromEmail;
    function getContactFromPhone(phone_number) {
        return db.models.Contact.find({
            where: {
                phone_number: phone_number
            }
        });
    }
    ContactManager.getContactFromPhone = getContactFromPhone;
    function updateContactDetailsWithId(id, updatedDetails) {
        return db.models.Contact.update(updatedDetails, {
            where: { id: id }
        });
    }
    ContactManager.updateContactDetailsWithId = updateContactDetailsWithId;
})(ContactManager = exports.ContactManager || (exports.ContactManager = {}));
