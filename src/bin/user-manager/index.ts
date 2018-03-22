import * as request from 'request'
import db from '../../models'
const winston = require('winston')
import * as Promise from "bluebird"
import * as crypto from 'crypto'
const errs = require('common-errors')
import * as utils from '../../utilities'
import { UserInstance } from '../../models/user';
import { Auth0Manager } from './auth0-manager'

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

    export interface IUser {
        first_name: string
        surname: string
        email_address: string
        [key: string]: any
    }

    // The distinction here is between user details (which might represent something approaching a full profile),
    // which is a combination of the Auth0 user profile, and the Voluble database information.

    /**
     * Returns the full decrypted metadata stored by Auth0 - this is the PII not covered by Auth0's basic Profile,
     * such as user role, and so on.
     * @param vol_user_id Voluble user ID
     */
    export function getUserMetadataByID(vol_user_id: string): Promise<IUserMetadata> {
        return utils.verifyNumberIsInteger(vol_user_id)
            .then(function (user_id) {
                return db.User.findById(user_id)
            })
            .then(function (user_inst) {
                if (!user_inst) { return Promise.reject(new errs.NotFoundError("Could not find user with ID " + vol_user_id)) }

                return Auth0Manager.getUserMetadataByID(user_inst.auth0_id)
                    .then(function (details: any) {
                        let m: IUserMetadata = {
                            "user_metadata": details["user_metadata"],
                            "app_metadata": details["app_metadata"]
                        }
                        return m
                    })
            })
    }
}