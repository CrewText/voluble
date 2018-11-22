"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth0 = require("auth0");
const winston = require('winston');
const errs = require('common-errors');
var Auth0Manager;
(function (Auth0Manager) {
    let auth0MgmtClient = new auth0.ManagementClient({
        domain: process.env.AUTH0_DOMAIN,
        clientId: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET
    });
    function getUserProfileByID(auth0_id) {
        return auth0MgmtClient.getUser({ id: auth0_id });
    }
    Auth0Manager.getUserProfileByID = getUserProfileByID;
    function createNewAuth0User(email_address, password) {
        return auth0MgmtClient.createUser({
            connection: "Username-Password-Authentication",
            email: email_address,
            password: password,
            verify_email: true,
            email_verified: false,
        });
    }
    Auth0Manager.createNewAuth0User = createNewAuth0User;
    function deleteUserFromAuth0(user_id) {
        return auth0MgmtClient.deleteUser({ id: user_id });
    }
    Auth0Manager.deleteUserFromAuth0 = deleteUserFromAuth0;
})(Auth0Manager = exports.Auth0Manager || (exports.Auth0Manager = {}));
