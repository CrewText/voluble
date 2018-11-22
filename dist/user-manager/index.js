"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../models");
const winston = require('winston');
const Promise = require("bluebird");
const errs = require('common-errors');
const auth0_manager_1 = require("./auth0-manager");
var UserManager;
(function (UserManager) {
    function getUserFullProfile(user_id) {
        return auth0_manager_1.Auth0Manager.getUserProfileByID(user_id);
    }
    UserManager.getUserFullProfile = getUserFullProfile;
    function deleteUserFromVoluble(user_id) {
        return db.models.User.findById(user_id)
            .then(function (user_entry) {
            if (!user_entry) {
                return Promise.reject(errs.NotFoundError("User with ID " + user_id + "cannot be found"));
            }
            return user_entry.destroy();
        })
            .then(function () {
            return Promise.resolve(true);
        });
    }
    function deleteUser(user_id) {
        return deleteUserFromVoluble(user_id)
            .then(function () {
            return auth0_manager_1.Auth0Manager.deleteUserFromAuth0(user_id);
        });
    }
    UserManager.deleteUser = deleteUser;
    function createNewUser(email, password, first_name, surname, phone_number) {
        auth0_manager_1.Auth0Manager.createNewAuth0User(email, password)
            .then(function (created_user) {
            db.models.Contact.create({
                id: created_user.user_id,
                defaultServicechainId: null,
                email_address: email,
                first_name: first_name,
                surname: surname,
                phone_number: phone_number
            });
        });
    }
    UserManager.createNewUser = createNewUser;
})(UserManager = exports.UserManager || (exports.UserManager = {}));
