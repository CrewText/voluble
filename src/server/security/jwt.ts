import { Request, Response, NextFunction } from "express";

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
import { JWT, JWKS, errors } from 'jose'
import Axios from 'axios'

export function checkJwt(req: Request, res: Response, next: NextFunction) {
    let auth_header_token: string
    try {
        auth_header_token = req.headers['authorization'].split(" ")[1].trim()
    }
    catch (e) {
        res.status(401).jsend.fail('Authorization token not provided')
        return
    }

    Axios.get(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`, { responseType: 'json' })
        .then((resp) => {
            let jwks_data = resp.data
            let jwks = JWKS.asKeyStore(jwks_data)
            return JWT.verify(auth_header_token, jwks, {
                audience: process.env.AUTH0_API_ID,
                issuer: `https://${process.env.AUTH0_DOMAIN}/`,
                algorithms: ['RS256']
            })
        })
        .then((_key) => {
            Object.defineProperty(req, "user", { configurable: true, enumerable: true, writable: true, value: JWT.decode(auth_header_token) })
            next()
        })
        .catch((err) => {
            if (err instanceof errors.JWTExpired) {
                res.status(401).jsend.fail("Authorization token expired")
            } else if (err instanceof errors.JWTMalformed) {
                res.status(401).jsend.fail('Authorization token malformed')
            } else {
                res.status(401).jsend.fail(err.message)
            }
        })
}
export var checkScopesMiddleware = function (scopes: string[]) {
    return jwtAuthz(scopes)
}