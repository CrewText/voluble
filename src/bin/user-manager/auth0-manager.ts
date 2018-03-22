import * as rp from 'request-promise'
import * as Promise from 'bluebird'
import * as jwt from 'jsonwebtoken'

export namespace Auth0Manager {

    export interface Auth0Profile{
        app_metadata: Object | any,
        blocked: boolean | void | null,
        created_at: Date,
        email: string,
        email_verified: boolean,
        identities: Object|any,
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
        user_metadata: Object|any,
        username: string
    }

    function getCCAccessToken(): PromiseLike<string> {
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
                return body["access_token"]
            })

        // Do verification of JWT
    }

    export function getUserProfileByID(auth0_id: string): PromiseLike<Auth0Profile> {
        return getCCAccessToken()
            .then(function (access_token) {
                let req_opts = {
                    method: 'GET',
                    url: process.env.AUTH0_BASE_URL + `/api/v2/users/${auth0_id}`,
                    headers: { 'Authorization': `Bearer ${access_token}` },
                    json: true
                }
            })
            .then(function (user_profile: any) {
                return <Auth0Profile>user_profile
            })

    }
}
