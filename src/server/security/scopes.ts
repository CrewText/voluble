import { NextFunction, Request, Response } from "express";
import { errors, scopes } from "voluble-common";

import { UserManager } from "../../user-manager";
import { ExpressMiddleware } from "../helpers/express_req_res_next";
export interface Auth0User {
    sub: string,
    organization: string,
    [key: string]: string
}

export function setupUserOrganizationMiddleware(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    const sub_id = req['user'].sub
    if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
        return next() // test client, let it do everything
    } else {
        return UserManager.getUserById(sub_id)
            .then(function (user) {
                if (!user) {
                    throw new errors.ResourceNotFoundError(`Auth0 user specified in JWT ${sub_id} does not exist`)
                }
                return user.getOrganization()
            })
            .then(function (org) {
                req['user'].organization = org.id
                return next()
            })
            .catch(e => {
                const serialized_data = req.app.locals.serializer.serializeError(e)
                if (e instanceof errors.ResourceNotFoundError) {
                    res.status(401).json(serialized_data)
                } else {
                    res.status(500).json(serialized_data)
                }
            })
    }
}

export function checkHasOrgAccessParamMiddleware(org_param_name: string): ExpressMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            checkHasOrgAccess(req['user'], req.params[org_param_name])
            return next()
        }
        catch (e) {
            const serialized_data = req.app.locals.serializer.serializeError(e)
            res.status(403).json(serialized_data)
        }
    }
}

// /**
//  * DEPRECATED - use @function checkHasOrgAccessParamMiddleware instead.
//  * @param req 
//  * @param res 
//  * @param next 
//  */
// export function checkHasOrgAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
//     try {
//         checkHasOrgAccess(req['user'], req.params.org_id)
//         return next()
//     }
//     catch (e) {
//         const serialized_data = req.app.locals.serializer.serializeError(e)
//         res.status(403).json(serialized_data)
//     }
// }

export function checkHasOrgAccess(user: Auth0User, requested_org: string): void {
    if (!hasScope(user, scopes.VolubleAdmin) && user.organization != requested_org) {
        throw new errors.ResourceOutOfUserScopeError(`User with org ID does not have access to the requested resource: ${requested_org}`)
    }
}

export function hasScope(user: Auth0User, scope: string | string[] | scopes[]): boolean {
    if (!(Array.isArray(scope))) { return user.permissions.includes(scope) }
    else {
        return scope.some((requested_scope, _idx, _arr) => user.permissions.includes(requested_scope))
    }
}

export function checkScopesMiddleware(scopes: string[]): ExpressMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!hasScope(req['user'], scopes)) {
            const e = new errors.ResourceOutOfUserScopeError(`User does not have permission to perform this action`)
            const serialized_data = req.app.locals.serializer.serializeError(e)
            res.status(403).json(serialized_data)
        } else {
            return next()
        }
    }
}