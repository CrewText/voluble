const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');

/**
 * JWT Authentication middleware. When used, the
 * Access Token must exist and be verified against
 * the Auth0 JSON Web Key Set.
 * Used from auth0.com
 */
export var checkJwt = jwt({
    /* Dynamically provide a signing key
    * based on the kid in the header and 
    * the signing keys provided by the JWKS endpoint.
    */
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience: process.env.AUTH0_API_ID,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
})

export const checkJwtErr = function (err, req, res, next) {
    if (err) {
        // logger.error(err)
        res.status(401).jsend.fail(err)
    } else {
        next()
    }
}

export var checkScopesMiddleware = function (scopes: string[]) {
    return jwtAuthz(scopes)
}