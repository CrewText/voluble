import { NextFunction, Request, Response } from "express";
import createRemoteJWKSet from 'jose/jwks/remote';
import jwtVerify from 'jose/jwt/verify';
import { JWTExpired, JWTInvalid } from 'jose/util/errors';
import { errors as VolubleErrors } from 'voluble-common';

//import jwtAuthz = require('express-jwt-authz');

export async function checkJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
    let auth_header_token: string
    try {
        auth_header_token = req.headers['authorization'].split(" ")[1].trim()
    }
    catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError('Authorization token not provided'))
        res.status(401).json(serialized_err)
        return
    }

    const jwks = createRemoteJWKSet(new URL("https://${process.env.AUTH0_VOLUBLE_TENANT}/.well-known/jwks.json"))
    jwtVerify(auth_header_token, jwks, {
        audience: process.env.AUTH0_API_ID,
        issuer: `https://${process.env.AUTH0_VOLUBLE_TENANT}/`,
        algorithms: ['RS256']
    })
        .then(result => {
            Object.defineProperty(req, "user", { configurable: true, enumerable: true, writable: true, value: result.payload })
            return next()
        })
        .catch(err => {

            if (err instanceof JWTExpired) {
                const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError("Authorization token expired"))
                res.status(401).json(serialized_err)
            } else if (err instanceof JWTInvalid) {
                const serialized_err = req.app.locals.serializer.serializeError(new VolubleErrors.AuthorizationFailedError("Authorization token invalid"))
                res.status(401).json(serialized_err)
            } else {
                const serialized_err = req.app.locals.serializer.serializeError(err)
                res.status(401).json(serialized_err)
            }
        })
}