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

    export type Role =  "user:contact" | "organization:author" | "organization:manager" | "organization:admin" | "voluble:admin",

    export type Auth0Profile = auth0.User

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
