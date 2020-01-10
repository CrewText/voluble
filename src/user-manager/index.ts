import * as Promise from "bluebird";
import * as request from 'request';
import * as winston from 'winston';
import * as db from '../models';

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

    let req_prom = Promise.promisify(request)

    function getMgmtAccessToken(): Promise<string> {
        let options = {
            method: 'POST',
            url: `${process.env["AUTH0_BASE_URL"]}/oauth/token`,
            headers: { 'content-type': 'application/json' },
            body:
            {
                grant_type: 'client_credentials',
                client_id: process.env["AUTH0_MGMT_CLIENT_ID"],
                client_secret: process.env["AUTH0_MGMT_CLIENT_SECRET"],
                audience: `${process.env["AUTH0_BASE_URL"]}/api/v2/`
            },
            json: true
        };


        return req_prom(options)
            .then(function (resp) {
                return resp.body.access_token
                // });
            })
    }

    export function getUserById(id: string): Promise<db.UserInstance> {
        return db.models.User.findByPk(id)
    }

    export function setUserScopes(user_id: string, desired_scopes: string[]): Promise<void> {
        return getMgmtAccessToken()
            .then(function (token) {
                return getUserById(user_id)
                    .then(function (user) {
                        return req_prom({
                            url: `${process.env["AUTH0_BASE_URL"]}/api/v2/users/auth0|${user.id}`,
                            method: 'GET',
                            headers: { 'Authorization': 'Bearer ' + token },
                            json: true
                        })
                            .then(function (resp) {
                                let app_metadata = resp.body.app_metadata ? resp.body.app_metadata : {}
                                let scopes: string[] = app_metadata.scopes ? app_metadata.scopes : []
                                return scopes
                            })
                            .then(function (scopes_available) {
                                scopes_available.push(...desired_scopes)
                                return req_prom({
                                    url: `${process.env["AUTH0_BASE_URL"]}/api/v2/users/${user.id}`,
                                    method: 'PATCH',
                                    headers: { 'Authorization': 'Bearer ' + token },
                                    body: { 'app_metadata': { 'scopes': scopes_available } },
                                    json: true
                                })
                            })
                            .then(function (req) {
                                console.log(req.body)
                                return
                            })
                    })

            })
    }
}