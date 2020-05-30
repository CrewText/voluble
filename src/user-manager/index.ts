import Axios from 'axios';
//import * as Promise from "bluebird";
//import * as request from 'request';
import * as winston from 'winston';
import * as db from '../models';
import { User } from "../models/user";

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'UserMgr' })

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

    //let req_prom = Promise.promisify(request)

    function getMgmtAccessToken(): Promise<string> {
        // let options = {
        //     //method: 'POST',
        //     //url: `${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/oauth/token`,
        //     headers: { 'content-type': 'application/json' },
        //     // body:
        //     // {
        //     //     grant_type: 'client_credentials',
        //     //     client_id: process.env["AUTH0_USER_MGMT_CLIENT_ID"],
        //     //     client_secret: process.env["AUTH0_USER_MGMT_CLIENT_SECRET"],
        //     //     audience: `${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/api/v2/`
        //     // },
        //     json: true
        // };

        return Axios.post(`${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/oauth/token`,
            {
                grant_type: 'client_credentials',
                client_id: process.env["AUTH0_USER_MGMT_CLIENT_ID"],
                client_secret: process.env["AUTH0_USER_MGMT_CLIENT_SECRET"],
                audience: `${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/api/v2/`
            },
            { headers: { 'content-type': 'application/json' }, responseType: "json" }
        )
            .then(resp => resp.data.access_token)

        // return req_prom(options)
        //     .then(function (resp) {
        //         return resp.body.access_token
        //         // });
        //     })
    }

    export function getUserById(id: string): Promise<User> {
        return db.models.User.findByPk(id)
    }

    export function createUser(id: string) {
        return db.models.User.create({ id: id })
    }

    export function setUserScopes(user_id: string, desired_scopes: string[]): Promise<void> {
        //TODO: #38 alter this to use permissions instead
        return getMgmtAccessToken()
            .then(function (token) {
                return getUserById(user_id)
                    .then(function (user) {

                        return Axios.get(`${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/api/v2/users/auth0|${user.id}`,
                            {
                                headers: { 'Authorization': 'Bearer ' + token },
                                responseType: "json"
                            })
                            .then(function (resp) {
                                let app_metadata = resp.data.app_metadata ? resp.data.app_metadata : {}
                                let scopes: string[] = app_metadata.scopes ? app_metadata.scopes : []
                                return scopes
                            })
                            .then(function (scopes_available) {
                                scopes_available.push(...desired_scopes)
                                return Axios.patch(`${process.env["https://${process.env.AUTH0_VOLUBLE_TENANT}"]}/api/v2/users/${user.id}`,
                                    { 'app_metadata': { 'scopes': scopes_available } },
                                    {
                                        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                                        responseType: "json"
                                    }
                                )
                            })
                            .then(function (req) {
                                return
                            })
                    })

            })
    }
}