import axios from 'axios';
import * as express from "express";
import * as winston from 'winston';
import { UserNotInOrgError, InvalidParameterValueError } from '../../voluble-errors';
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccessParamMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';
import { generate } from 'generate-password'

const router = express.Router();
let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'Auth0ProxyRoute' })

class UnauthorizedError extends Error { }

interface Token {
    access_token: string
    scope: string
    expires_in: number,
    token_type: "Bearer"
}

let current_auth_token: Token = null;
let current_auth_token_expiry: number = 0;

let getMgmtAuthToken = (): Promise<Token> => {
    // Use existing auth token if it's still valid. We'll assume that the request might take up to a second, so give us
    // some leeway.
    if (current_auth_token != null && current_auth_token_expiry > Date.now() - 1000) {
        return Promise.resolve(current_auth_token);
    }

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
            current_auth_token = resp.data;
            current_auth_token_expiry = (current_auth_token.expires_in * 1000) + Date.now();
            return current_auth_token;
        })
        .catch(e => {
            if (e.response) {
                logger.error(`Error fetching user mgmt token`, { status: e.response.status, data: e.response.data, headers: e.response.headers })
            } else if (e.request) {
                logger.error(`Error in user mgmt token request`, { e: e.toJSON() })
            } else {
                logger.error(`Unspecified error when retrieving user mgmt token`, { e: e.message })
            }
            throw e;
        })
}

let checkOriginIsAllowed = (req, res, next) => {
    if (!process.env.AUTH0_PROXY_ALLOWED_ORIGINS.split(';').includes(req.get('Origin'))) {
        let e = req.app.locals.serializer.serializeError(new UnauthorizedError(`Origin not in allowed origins list: ${req.get('Origin')}`))
        res.status(401).json(e)
    } else next()
}

/**
 * Retrieve a given user from the Organization
 */
router.get('/users/:org_id/:user_id', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    (req, res, next) => {
        getMgmtAuthToken()
            .then(token => {
                let url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users/${req.params.user_id}`)
                url.searchParams.append("fields", "given_name,family_name,picture,name,app_metadata")
                url.searchParams.append("include_fields", "true")
                return axios.get(url.toString(),
                    {
                        headers: { 'Authorization': `Bearer ${token.access_token}` }
                    })
            })
            .then(resp => {
                if (resp.data.app_metadata.organization != req.params.org_id) { throw new UserNotInOrgError(`Organization ${req.params.org_id} does not contain a user with ID ${req.params.user_id}`) }
                return res.status(resp.status).json(resp.data)
            })
            .catch(e => {
                let s_error = req.app.locals.serializer.serializeError(new Error(`Unable to retrieve user: ${e.message}`))
                res.status(400).json(s_error)

                logger.error(e);
            })
    })

/**
 * Get a list of the users in the Organization.
 */
router.get('/users/:org_id', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    (req, res, next) => {
        getMgmtAuthToken()
            .then(token => {
                let url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users`)
                url.searchParams.append("fields", "picture,name,email,app_metadata")
                url.searchParams.append("include_fields", "true")
                url.searchParams.append("search_engine", "v3")
                url.searchParams.append("q", `app_metadata.organization:"${req.params.org_id}"`)
                return axios.get(url.toString(),
                    {
                        headers: { 'Authorization': `Bearer ${token.access_token}` }
                    })
            })

            .then(resp => {
                return res.status(resp.status).json(resp.data)
            })
            .catch(e => {
                let s_error = req.app.locals.serializer.serializeError(new Error(`Unable to retrieve user list: ${e.message}`))
                res.status(400).json(s_error)
                if (e.response) { logger.error("Retrieving user list failed", { data: e.response.data, status: e.response.status }) }
            })
    })

/**
 * Create a new User in the Organization, with a random, Auth0-friendly password.
 */
router.post('/users/:org_id', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    (req, res, next) => {

        ["email", "first_name", "last_name", "avatar_uri"].forEach(field => {
            if (!req.body[field]) { throw new InvalidParameterValueError(`Field ${field} must be supplied`) }
        });

        getMgmtAuthToken()
            .then(mgmt_token => {
                let url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users`)
                let body = {
                    email: req.body.email,
                    given_name: req.body.first_name,
                    family_name: req.body.last_name,
                    picture: req.body.avatar_uri,
                    password: req.body.password || generate({ length: 12, numbers: true, symbols: true, uppercase: true, lowercase: true, strict: true }),
                    connection: "Username-Password-Authentication",
                    verify_email: true
                }

                return axios.post(url.toString(), body,
                    {
                        headers: {
                            'Authorization': `Bearer ${mgmt_token.access_token}`,
                            'Content-Type': 'application/json'
                        }, responseType: "json"
                    })
                    .then(resp => {
                        let url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users/${resp.data.user_id}`)
                        let body = {
                            app_metadata: {
                                organization: req.params.org_id
                            }
                        }

                        return axios.patch(url.toString(), body,
                            {
                                headers: { 'Authorization': `Bearer ${mgmt_token.access_token}`, 'Content-Type': 'application/json' },
                                responseType: "json"
                            })
                    })
            })

            .then(resp => {
                return res.status(resp.status).json(resp.data)
            })
            .catch(e => {
                let s_error = req.app.locals.serializer.serializeError(new Error(`Unable to create new user: ${e.message}`))
                res.status(400).json(s_error)
                if (e.response) { logger.error("Creating new user failed", { data: e.response.data, status: e.response.status }) }
            })
    })

router.post('/users/:org_id/:user_id/resetpassword', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    (req, res, next) => {
        getMgmtAuthToken()
            .then(token => {
                let url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/tickets/password-change`)
                let body = {
                    user_id: req.params.user_id,
                    mark_email_as_verified: true,
                    //includeEmailInRedirect: false
                }

                return axios.post(url.toString(), body,
                    {
                        headers: { 'Authorization': `Bearer ${token.access_token}` }
                    })
            })
            .then(resp => {
                return res.status(resp.status).json(resp.data)
            })
            .catch(e => {
                let s_error = req.app.locals.serializer.serializeError(new Error(`Unable to reset user password: ${e.message}`))
                res.status(400).json(s_error)
                if (e.response) { logger.error("Resetting user password failed", { data: e.response.data, status: e.response.status }) }
            })
    })

module.exports = router;