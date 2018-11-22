"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const winston = require('winston');
const errs = require('common-errors');
const user_manager_1 = require("../../user-manager");
router.get('/', function (req, res, next) {
});
router.get('/:user_id', function (req, res, next) {
    user_manager_1.UserManager.getUserFullProfile(req.params["user_id"])
        .then(function (user_profile) {
        res.jsend.success(user_profile);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.post('/', function (req, res, next) {
    if (!req.body.auth0_id) {
        res.status(400).json({
            error: "Missing field: auth0_id"
        });
        return;
    }
    user_manager_1.UserManager.getUserEntryByAuth0ID(req.body.auth0_id)
        .then(function (user_entry) {
        if (!user_entry) {
            user_manager_1.UserManager.addNewUser(req.body.auth0_id, req.body.org_id || null)
                .then(function (new_user_entry) {
                res.status(201).json(new_user_entry);
            });
        }
        else {
            res.status(200).json(user_entry);
        }
    })
        .catch(function (error) {
        res.status(500).send(error.message);
    });
});
router.delete('/:voluble_user_id', function (req, res, next) {
    user_manager_1.UserManager.deleteUserFromVoluble(req.params.voluble_user_id)
        .then(function (user_deleted) {
        if (user_deleted) {
            res.status(204).send();
        }
        else {
            res.status(500).send();
        }
    })
        .catch(errs.NotFoundError, function (error) {
        res.status(404).json({
            error: `User not found: ${req.params.voluble_user_id}`
        });
    });
});
module.exports = router;
