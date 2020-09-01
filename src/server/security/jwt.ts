import Axios from 'axios';
import { NextFunction, Request, Response } from "express";
import { errors as JWTerrors, JWKS, JWT } from 'jose';
import { errors as VolubleErrors } from 'voluble-common'
    ;

//import jwtAuthz = require('express-jwt-authz');

export function checkJwt(req: Request, res: Response, next: NextFunction): void {
    let auth_header_token: string
    try {
        auth_header_token = req.headers['authorization'].split(" ")[1].trim()
    }
    catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError('Authorization token not provided'))
        res.status(401).json(serialized_err)
        return
    }

    Axios.get(`https://${process.env.AUTH0_VOLUBLE_TENANT}/.well-known/jwks.json`, { responseType: 'json' })
        .then((resp) => {
            const jwks_data = resp.data
            const jwks = JWKS.asKeyStore(jwks_data)
            return JWT.verify(auth_header_token, jwks, {
                audience: process.env.AUTH0_API_ID,
                issuer: `https://${process.env.AUTH0_VOLUBLE_TENANT}/`,
                algorithms: ['RS256']
            })
        })
        .then((_key) => {
            Object.defineProperty(req, "user", { configurable: true, enumerable: true, writable: true, value: JWT.decode(auth_header_token) })
            return next()
        })
        .catch((err) => {

            if (err instanceof JWTerrors.JWTExpired) {
                const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError("Authorization token expired"))
                res.status(401).json(serialized_err)
            } else if (err instanceof JWTerrors.JWTMalformed) {
                const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError("Authorization token malformed"))
                res.status(401).json(serialized_err)
            } else {
                const serialized_err = req.app.locals.serializer.serializeError(err)
                res.status(401).json(serialized_err)
            }
        })
}