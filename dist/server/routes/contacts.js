"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const utils = require("../../utilities");
const errs = require('common-errors');
const contact_manager_1 = require("../../contact-manager");
router.get('/', function (req, res, next) {
    let offset = (req.query.offset == undefined ? 0 : req.query.offset);
    return utils.verifyNumberIsInteger(offset)
        .then(function (offset) {
        return contact_manager_1.ContactManager.getHundredContacts(offset);
    })
        .then(function (rows) {
        res.jsend.success(rows);
    })
        .catch(function (err) {
        res.jsend.error(err.message);
    });
});
router.get('/:contact_id', function (req, res, next) {
    contact_manager_1.ContactManager.checkContactWithIDExists(req.params.contact_id)
        .then(function (id) {
        return contact_manager_1.ContactManager.getContactWithId(id);
    })
        .then(function (user) {
        if (user) {
            res.jsend.success(user);
        }
    })
        .catch(errs.NotFoundError, function (error) {
        res.jsend.fail({ "id": "No user exists with this ID." });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.post('/', function (req, res, next) {
    return contact_manager_1.ContactManager.createContact(req.body.first_name, req.body.surname, req.body.email_address, req.body.phone_number, req.body.default_servicechain)
        .then(function (newContact) {
        res.jsend.success(newContact);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.put('/:contact_id', function (req, res, next) {
    return contact_manager_1.ContactManager.checkContactWithIDExists(req.params.contact_id)
        .then(function (id) {
        return contact_manager_1.ContactManager.updateContactDetailsWithId(id, req.body);
    })
        .then(function (updateDetails) {
        res.jsend.success(updateDetails[1][0]);
    })
        .catch(errs.NotFoundError, function (err) {
        res.jsend.fail({ "id": "No user exists with this ID." });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.delete('/:contact_id', function (req, res, next) {
    utils.verifyNumberIsInteger(req.params.contact_id);
    return contact_manager_1.ContactManager.deleteContactFromDB(req.params.contact_id)
        .then(function (resp) {
        res.jsend.success(resp);
    })
        .catch(errs.TypeError, function (error) {
        res.jsend.fail({ 'id': "ID supplied is not an integer." });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.get('/:contact_id/messages', function (req, res, next) {
});
module.exports = router;
