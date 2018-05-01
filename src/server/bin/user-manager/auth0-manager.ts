import * as rp from 'request-promise'
import * as Promise from 'bluebird'
import * as jwt from 'jsonwebtoken'
import { access } from 'fs-extra';
import organization from '../../models/organization';
const winston = require('winston')
const errs = require('common-errors')

export namespace Auth0Manager {

    /**
     * Auth0ProfileUserMetadata is a representation of the User Metadata field available in a given Auth0 profile.
     * It is intended to be used for data that the user has r/w access to.
     */
    export interface Auth0ProfileUserMetadata{
        phone_number: string,
    }

    /**
     * Auth0ProfileAppMetadata is a representation of the App Metadata field available in a given Auth0 profile.
     * It is intended to be used for data that the user has no access to.
     */
    export interface Auth0ProfileAppMetadata{
        role: "user:contact" | "organization:author" | "organization:manager" | "organization:admin" | "voluble:admin",
        organization: number
    }

    export interface Auth0Profile {
        app_metadata: Auth0ProfileAppMetadata,
        blocked: boolean | void | null,
        created_at: Date,
        email: string,
        email_verified: boolean,
        identities: Object | any,
        multifactor: string[] | void | null,
        last_ip: string | void | null,
        last_login: Date | void | null,
        logins_count: number | void | null,
        name: string,
        nickname: string,
        phone_number: string,
        phone_verified: boolean,
        picture: string,
        updated_at: Date,
        user_id: string,
        user_metadata: Auth0ProfileUserMetadata,
        username: string
    }

    interface CCAccessToken {
        access_token: string,
        token_type: string,
        expires_in: number,
        [key: string]: any
    }

    function getCCAccessToken(): Promise<CCAccessToken> {
        let req_opts = {
            method: 'POST',
            url: process.env.AUTH0_BASE_URL + "/oauth/token",
            headers: { 'content-type': 'application/json' },
            body:
                {
                    grant_type: 'client_credentials',
                    client_id: process.env.AUTH0_CLIENT_ID,
                    client_secret: process.env.AUTH0_CLIENT_SECRET,
                    audience: process.env.AUTH0_CLIENT_API_IDENTIFER
                },
            json: true

        }

        return rp(req_opts)
            .then(function (body: any) {
                if (!body["access_token"]) {
                    return Promise.reject(new errs.NotFoundError('No access token received'))
                }
                return Promise.resolve(<CCAccessToken>body)
            })

        // TODO: Do verification of JWT
        // TODO: Handle errors
    }

    export function getUserProfileByID(auth0_id: string): Promise<Auth0Profile> {
        return getCCAccessToken()
            .then(function (access_token) {
                //winston.debug(`Using token ${access_token["access_token"]}`)
                let req_opts = {
                    method: 'GET',
                    url: process.env.AUTH0_BASE_URL + `/api/v2/users/${auth0_id}`,
                    headers: { 'Authorization': "Bearer " + access_token.access_token },
                    json: true
                }
                return rp(req_opts)
            })
            .then(function (user_profile: any) {
                if (!user_profile) {
                    return Promise.reject(new errs.NotFoundError("Could not find Auth0 user with AID " + auth0_id))
                }
                winston.debug("Found user profile for " + auth0_id + ": " + user_profile.email)
                return Promise.resolve(<Auth0Profile>user_profile)
            })

    }

    /**
     * Creates a new user in Auth0 and returns the new Auth0Profile
     */
    export function createNewAuth0User(email_address: string, password: string):Promise<Auth0Profile>{
        getCCAccessToken()
        .then(function (access_token){
            let req_opts = {
                method: 'POST',
                url: process.env.AUTH0_BASE_URL + '/api/v2/users',
                headers: {'Authorization': `Bearer ${access_token.access_token}`},
                json: true,
                body: {
                    connection: "Username-Password-Authentication",
                    email
                }
            }
        })
    }
}
