import * as request from 'request'
import * as db from '../models'
const winston = require('winston')
import * as Promise from "bluebird"
import * as crypto from 'crypto'
const errs = require('common-errors')
import * as utils from '../utilities'
//import { Auth0Manager } from './auth0-manager'

/**
 * The UserManager exists in order to co-ordinate the functions regarding Voluble users, and
 * constructing full user profiles from the information stored in the Voluble database and extra
 * PII stored in the Auth0 database, both in cleartext and encrypted.
*/
export namespace UserManager {

    export interface IUserMetadata {
        app_metadata: Object,
        user_metadata: Object
    }

    export function getUserFromAuth0Id(auth0_id: string): Promise<db.UserInstance> {
        return db.models.User.findOne({
            where:
            {
                id: auth0_id
            }
        })
    }

    /*
    export type Auth0Profile = Auth0Manager.Auth0Profile

    // The distinction here is between user details (which might represent something approaching a full profile),
    // which is a combination of the Auth0 user profile, and the Voluble database information.


    export function getUserFullProfile(user_id: string): Promise<Auth0Manager.Auth0Profile> {
        return Auth0Manager.getUserProfileByID(user_id)
    }

    function deleteUserFromVoluble(user_id: string): Promise<boolean> {
        return db.models.User.findById(user_id)
            .then(function (user_entry) {
                if (!user_entry) { return Promise.reject(errs.NotFoundError("User with ID " + user_id + "cannot be found")) }

                return user_entry.destroy()
            })
            .then(function () {
                return Promise.resolve(true)
            })
    }

    export function deleteUser(user_id: string) {
        return deleteUserFromVoluble(user_id)
            .then(function () {
                return Auth0Manager.deleteUserFromAuth0(user_id)
            })
    }

    /**
     * Create a new user in Voluble. Firstly adds the new user to Auth0, and then uses the Auth0 ID to create a corresponding entry in the 
     * Voluble database.
     */
    /*
    export function createNewUser(email: string, password: string, first_name: string, surname: string, phone_number: string) {
        Auth0Manager.createNewAuth0User(email, password)
            .then(function (created_user) {
                db.models.Contact.create({
                    //id: <string>created_user.user_id,
                    //defaultServicechainId: null,
                    email_address: email,
                    first_name: first_name,
                    surname: surname,
                    phone_number: phone_number
                })
            })
    }
    */

}