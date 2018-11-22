"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const winston = require('winston');
const utils = require("../../utilities");
const errs = require('common-errors');
const _1 = require("../../message-manager/");
const contact_manager_1 = require("../../contact-manager");
router.get('/', function (req, res, next) {
    let offset = (req.query.offset == undefined ? 0 : req.query.offset);
    utils.verifyNumberIsInteger(offset)
        .then(function (off) {
        return _1.MessageManager.getHundredMessageIds(off);
    })
        .then(function (rows) {
        res.jsend.success(rows);
    })
        .catch(errs.TypeError, function (error) {
        res.jsend.fail({ 'id': "Supplied ID is not an integer" });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.get('/:message_id', function (req, res, next) {
    return utils.verifyNumberIsInteger(req.params.message_id)
        .then(function (id) {
        return _1.MessageManager.getMessageFromId(id);
    })
        .then(function (msg) {
        if (msg) {
            res.jsend.success(msg);
        }
    })
        .catch(errs.TypeError, function (error) {
        res.jsend.fail({ 'id': "Supplied ID is not an integer" });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.post('/', function (req, res, next) {
    winston.info("Creating new message");
    _1.MessageManager.createMessage(req.body.msg_body, req.body.contact_id, req.body.direction || "OUTBOUND", req.body.is_reply_to || null, req.body.servicechain_id || null, null)
        .then(function (msg) {
        return contact_manager_1.ContactManager.checkContactWithIDExists(req.body.contact_id)
            .then(function (id) {
            return msg;
        });
    })
        .then(function (msg) {
        return _1.MessageManager.sendMessage(msg);
    })
        .then(function (msg) {
        res.jsend.success(msg);
    })
        .catch(errs.NotFoundError, function (error) {
        res.jsend.fail(`Contact with ID ${req.body.contact_id} does not exist.`);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
module.exports = router;
