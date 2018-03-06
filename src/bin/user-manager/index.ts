import * as request from 'request'
import db from '../../models'
const winston = require('winston')
import * as Promise from "bluebird"
import * as crypto from 'crypto'
const errs = require('common-errors')
import * as utils from '../../utilities'
import { UserInstance } from '../../models/user';
import { Auth0Manager } from './auth0-manager'

export namespace UserManager {

    export interface IUser {
        first_name: string
        surname: string
        email_address: string
        [key: string]: any
    }

    function encryptUserAttributes(user: IUser, encr_iv: string): string {
        // As recommended by https://auth0.com/rules/encrypt-sensitive-data
        let data_string = JSON.stringify(user || {})

        let decodeKey = crypto.createHash('sha256')
            .update(process.env.ENCR_PASS || "", 'utf8').digest()

        let cipher = crypto.createCipheriv('aes-256-cbc', decodeKey, encr_iv)
        return cipher.update(data_string, 'utf8', 'base64') + cipher.final('base64')
    }

    function decryptUserAttributes(encrypted_data: string, encr_iv: string): IUser {
        // As recommended by https://auth0.com/rules/decrypt-sensitive-data

        let encodeKey = crypto.createHash('sha256')
            .update(process.env.ENCR_PASS || "", 'utf8').digest()

        let cipher = crypto.createDecipheriv('aes-256-cbc', encodeKey, encr_iv)
        let decr_string = cipher.update(encrypted_data, 'base64', 'utf8') + cipher.final('base64')

        return <IUser>JSON.parse(decr_string)
    }

    export function getUserDetailsById(id: string): Promise<IUser> {
        return utils.verifyNumberIsInteger(id)
            .then(function (user_id) {
                return db.User.findById(user_id)
            })
            .then(function (user_inst) {
                if (!user_inst) { return Promise.reject(new errs.NotFoundError("Could not find user with ID " + id)) }

                return Auth0Manager.getEncryptedUserDetailsByID(user_inst.auth0_id)
                    .then(function (encrypted_details) {
                        return decryptUserAttributes(encrypted_details, user_inst.auth0_encr_iv)
                    })
            })
    }
}