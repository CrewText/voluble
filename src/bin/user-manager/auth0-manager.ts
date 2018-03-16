import * as rp from 'request-promise'
import * as Promise from 'bluebird'
import * as jwt from 'jsonwebtoken'

export namespace Auth0Manager {

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

    export function getEncryptedUserMetadataByID(auth0_id: string): PromiseLike<Object> {
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
                return {
                    user_metadata: user_profile["user_metadata"],
                    app_metadata: user_profile["app_metadata"]
                }
            })

    }
}
