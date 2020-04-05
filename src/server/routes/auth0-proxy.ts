import * as express from "express";
import * as winston from 'winston';
import axios from 'axios'

const router = express.Router();
let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'Auth0ProxyRoute' })

class UnauthorizedError extends Error { }

interface Token {
    access_token: string
    scope: string
    expires_in: number,
    token_type: "Bearer"
}

let getMgmtAuthToken = () => {
    let url = `https://${process.env.AUTH0_VOLUBLE_TENANT}/oauth/token`
    let body = new URLSearchParams()
    body.append('grant_type', 'client_credentials')
    body.append('client_id', process.env.AUTH0_USER_MGMT_CLIENT_ID)
    body.append('client_secret', process.env.AUTH0_USER_MGMT_CLIENT_SECRET)
    body.append('audience', `https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/`)
    return axios.post(url, body, {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        responseType: "json"
    })
        .then(resp => {
            return <Token>resp.data
        })
        .catch(e => {
            if (e.response) {
                logger.error(`Error fetching user mgmt token`, { status: e.response.status, data: e.response.data, headers: e.response.headers })
                throw e
            } else if (e.request) {
                logger.error(`Error in user mgmt token request`, { e: e.toJSON() })
                throw e
            } else {
                logger.error(`Unspecified error when retrieving user mgmt token`, { e: e.message })
                throw e
            }
            // return null
        })
}

let checkOriginIsAllowed = (req, res, next) => {
    if (!process.env.AUTH0_PROXY_ALLOWED_ORIGINS.split(';').includes(req.get('Origin'))) {
        let e = req.app.locals.serializer.serializeError(new UnauthorizedError(`Origin not in allowed origins list: ${req.get('Origin')}`))
        res.status(401).json(e)
    } else next()
}

// Do a thing that checks against allowed origins
router.get('/users/:user_id', checkOriginIsAllowed,
    (req, res, next) => {
        getMgmtAuthToken()
            .then(token => {
                let url = encodeURI(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users/${req.params.user_id}`) + `?fields=given_name,family_name,picture,name&include_fields=true`
                return axios.get(url,
                    {
                        headers: { 'Authorization': `Bearer ${token.access_token}` }
                    })
            })
            .then(resp => {
                return res.status(resp.status).json(resp.data)
            })
            .catch(e => {
                let s_error = req.app.locals.serializer.serializeError(new Error(`Unable to retrieve user management token: ${e.message}`))
                res.status(401).json(s_error)
                if (e.response) { logger.error("Retrieving user failed", { data: e.response.data, status: e.response.status }) }
            })
    })

module.exports = router;