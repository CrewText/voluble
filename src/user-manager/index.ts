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
                auth0_id: auth0_id
            }
        })
    }

    export function getUserById(id: string): Promise<db.UserInstance> {
        return db.models.User.findOne({
            where:
                { id: id }
        })
    }
}