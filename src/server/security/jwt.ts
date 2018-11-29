const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');

/**
 * JWT Authentication middleware. When used, the
 * Access Token must exist and be verified against
 * the Auth0 JSON Web Key Set.
 * Used from auth0.com
 */
export const checkJwt = jwt({
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
    audience: process.env.AUTH0_API_IDENT,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
});

/**
 * Check that the JWT has at least one of the scopes provided.
 * @param {Array<string>} scopes A list of access scopes, only one of which is required for access.
 */
export const checkScopes = function (scopes: string[]) {
    return jwtAuthz(scopes)
}