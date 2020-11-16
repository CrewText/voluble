import axios from 'axios';
import * as express from "express";
import { generate } from 'generate-password';
import { errors } from 'voluble-common';
import * as winston from 'winston';

import { checkJwt } from '../security/jwt';
import { checkHasOrgAccessParamMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';


const router = express.Router();
const logger = winston.loggers.get(process.title).child({ module: 'Auth0ProxyRoute' })

class UnauthorizedError extends Error { }

interface Token {
    access_token: string
    scope: string
    expires_in: number,
    token_type: "Bearer"
}

let current_auth_token: Token = null;
let current_auth_token_expiry = 0;

const getMgmtAuthToken = async (): Promise<Token> => {
    // Use existing auth token if it's still valid. We'll assume that the request might take up to a second, so give us
    // some leeway.
    if (current_auth_token && current_auth_token_expiry > Date.now() - 1000) {
        return Promise.resolve(current_auth_token);
    }

    const url = `https://${process.env.AUTH0_VOLUBLE_TENANT}/oauth/token`
    const body = new URLSearchParams()
    body.append('grant_type', 'client_credentials')
    body.append('client_id', process.env.AUTH0_USER_MGMT_CLIENT_ID)
    body.append('client_secret', process.env.AUTH0_USER_MGMT_CLIENT_SECRET)
    body.append('audience', `https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/`)

    try {
        const resp = await axios.post(url, body, {
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            responseType: "json"
        })
        current_auth_token = resp.data;
        current_auth_token_expiry = (current_auth_token.expires_in * 1000) + Date.now();
        return current_auth_token

    } catch (e) {
        if (e.response) {
            logger.error(`Error fetching user mgmt token`, { status: e.response.status, data: e.response.data, headers: e.response.headers })
        } else if (e.request) {
            logger.error(`Error in user mgmt token request`, { e: e.toJSON() })
        } else {
            logger.error(`Unspecified error when retrieving user mgmt token`, { e: e.message })
        }
        throw e;
    }
}

const checkOriginIsAllowed = (req, res, next) => {
    if (!process.env.AUTH0_PROXY_ALLOWED_ORIGINS.split(';').includes(req.get('Origin'))) {
        const e = req.app.locals.serializer.serializeError(new UnauthorizedError(`Origin not in allowed origins list: ${req.get('Origin')}`))
        res.status(401).json(e)
    } else return next()
}

/**
 * Retrieve a given user from the Organization
 */
router.get('/users/:org_id/:user_id', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        const token = await getMgmtAuthToken()

        const url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users/${req.params.user_id}`)
        url.searchParams.append("fields", "given_name,family_name,picture,name,app_metadata")
        url.searchParams.append("include_fields", "true")
        const resp = await axios.get(url.toString(),
            {
                headers: { 'Authorization': `Bearer ${token.access_token}` },
                validateStatus: _ => true
            })
        if (resp.data.app_metadata.organization != req.params.org_id) { return next(new errors.UserNotInOrgError(`Organization ${req.params.org_id} does not contain a user with ID ${req.params.user_id}`)) }
        res.status(resp.status).json(resp.data)
    })

/**
 * Get a list of the users in the Organization.
 */
router.get('/users/:org_id', checkOriginIsAllowed, checkJwt, setupUserOrganizationMiddleware, checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        const token = await getMgmtAuthToken()

        const url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users`)
        url.searchParams.append("fields", "picture,name,email,app_metadata")
        url.searchParams.append("include_fields", "true")
        url.searchParams.append("search_engine", "v3")
        url.searchParams.append("q", `app_metadata.organization:"${req.params.org_id}"`)
        const resp = await axios.get(url.toString(),
            {
                headers: { 'Authorization': `Bearer ${token.access_token}` },
                validateStatus: _ => true
            })

        res.status(resp.status).json(resp.data)
        return next()
    })

/**
 * Create a new User in the Organization, with a random, Auth0-friendly password.
 */
router.post('/users/:org_id',
    checkOriginIsAllowed,
    checkJwt,
    setupUserOrganizationMiddleware,
    checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        ["email", "first_name", "last_name", "avatar_uri"].forEach(field => {
            if (!req.body[field]) { throw new errors.InvalidParameterValueError(`Field ${field} must be supplied`) }
        });

        const mgmt_token = await getMgmtAuthToken()

        const create_user_url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users`)
        const create_user_body = {
            email: req.body.email,
            given_name: req.body.first_name,
            family_name: req.body.last_name,
            picture: req.body.avatar_uri,
            password: req.body.password || generate({ length: 12, numbers: true, symbols: true, uppercase: true, lowercase: true, strict: true }),
            connection: "Username-Password-Authentication",
            verify_email: true
        }

        const create_user_resp = await axios.post(create_user_url.toString(), create_user_body,
            {
                headers: {
                    'Authorization': `Bearer ${mgmt_token.access_token}`,
                    'Content-Type': 'application/json'
                }, responseType: "json",
                validateStatus: (_) => true
            })

        const update_meta_url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/users/${create_user_resp.data.user_id}`)
        const update_meta_body = {
            app_metadata: {
                organization: req.params.org_id
            }
        }

        const update_meta_resp = await axios.patch(update_meta_url.toString(), update_meta_body,
            {
                headers: { 'Authorization': `Bearer ${mgmt_token.access_token}`, 'Content-Type': 'application/json' },
                responseType: "json",
                validateStatus: (_) => true
            })


        res.status(update_meta_resp.status).json(update_meta_resp.data)
        return next()
    })

router.post('/users/:org_id/:user_id/resetpassword',
    checkOriginIsAllowed,
    checkJwt,
    setupUserOrganizationMiddleware,
    checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        const token = await getMgmtAuthToken()

        const url = new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/api/v2/tickets/password-change`)
        const body = {
            user_id: req.params.user_id,
            mark_email_as_verified: true,
            //includeEmailInRedirect: false
        }

        const resp = await axios.post(url.toString(), body,
            {
                headers: { 'Authorization': `Bearer ${token.access_token}` },
                validateStatus: (_) => true
            })

        res.status(resp.status).json(resp.data)
        return next()

    })

export default router;