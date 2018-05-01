import * as rp from 'request-promise'
import * as Promise from 'bluebird'
import * as jwt from 'jsonwebtoken'
import * as auth0 from 'auth0'
import organization from '../../models/organization';
const winston = require('winston')
const errs = require('common-errors')

export namespace Auth0Manager {

    /**
     * Auth0ProfileUserMetadata is a representation of the User Metadata field available in a given Auth0 profile.
     * It is intended to be used for data that the user has r/w access to.
     */
    export interface Auth0ProfileUserMetadata {
        phone_number: string,
    }

    /**
     * Auth0ProfileAppMetadata is a representation of the App Metadata field available in a given Auth0 profile.
     * It is intended to be used for data that the user has no access to.
     */
    export interface Auth0ProfileAppMetadata {
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

    let auth0MgmtClient = new auth0.ManagementClient({
        domain: <string>process.env.AUTH0_DOMAIN,
        clientId: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET
    })

    export function getUserProfileByID(auth0_id: string): Promise<auth0.User> {
        return auth0MgmtClient.getUser({ id: auth0_id })
    }

    /**
     * Creates a new user in Auth0 and returns the new Auth0Profile
     */
    export function createNewAuth0User(email_address: string, password: string): Promise<auth0.User> {
        return auth0MgmtClient.createUser({
            connection: "Username-Password-Authentication",
            email: email_address,
            password: password,
            verify_email: true,
            email_verified: false,
        })
    }
}
