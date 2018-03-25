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

    export type Auth0Profile = Auth0Manager.Auth0Profile

    // The distinction here is between user details (which might represent something approaching a full profile),
    // which is a combination of the Auth0 user profile, and the Voluble database information.

    
    export function addNewUser(Auth0ID: string, org_id: number | null){
        return db.User.create({
            auth0_id: Auth0ID,
            org_number: org_id || null
        })
        //TODO: Handle database errors
    }

    export function getUserProfile(voluble_user_id: number): PromiseLike<Auth0Manager.Auth0Profile>{
        return utils.verifyNumberIsInteger(voluble_user_id)
        .then(function(voluble_uid){
            return db.User.findById(voluble_uid)
            
        .then(function(user_entry){
            if (!user_entry){
                return Promise.reject(new errs.NotFoundError(`Couldn't find user with VID ${voluble_user_id} in the database`))
            }
            return Auth0Manager.getUserProfileByID(user_entry.auth0_id)
        })
        })
    }

}