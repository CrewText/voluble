import * as rp from 'request-promise'

export namespace Auth0Manager {

    export function getEncryptedUserDetailsByID(auth0_id: string): PromiseLike<string> {
        let req_opts = {
            method: 'POST',
            url: process.env.AUTH0_BASE_URL + "/oauth/token",
            headers: { 'content-type': 'application/json' },
            body:
                {
                    grant_type: 'client_credentials',
                    client_id: '0nUX32BCmm16aWmtfiDi3TSryXgYiJm9',
                    client_secret: 'GC9aRT84s_8Uv5kMWRVEP4qh3VzyuK6QNZyylCfe5bgaXOB-eOziQImTgEv_dBqZ',
                    audience: process.env.AUTH0_CLIENT_API_IDENTIFER
                },
            json: true

        }

        return rp(req_opts)
            .then(function (body) {
                return body
            })

        // Do verification of JWT

    }
}
