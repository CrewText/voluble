import { scopes } from "voluble-common";
import { UserManager } from "../../user-manager";
import { ResourceNotFoundError, ResourceOutOfUserScopeError } from '../../voluble-errors';
import { Request, Response, NextFunction } from "express";

export function setupUserOrganizationMiddleware(req: Request, res: Response, next: NextFunction) {
    let sub_id = req['user'].sub
    if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
        return next() // test client, let it do everything
    } else {
        UserManager.getUserById(sub_id)
            .then(function (user) {
                if (!user) {
                    throw new ResourceNotFoundError(`Auth0 user specified in JWT ${sub_id} does not exist`)
                }
                return user.getOrganization()
            })
            .then(function (org) {
                req['user'].organization = org.id
                return next()
            })
            .catch(e => {
                let serialized_data = req.app.locals.serializer.serializeError(e)
                if (e instanceof ResourceNotFoundError) {
                    res.status(401).json(serialized_data)
                } else {
                    res.status(500).json(serialized_data)
                }
            })
    }
}

export function checkHasOrgAccessMiddleware(req, res, next) {
    try {
        checkHasOrgAccess(req['user'], req.params.org_id)
        next()
    }
    catch (e) {
        let serialized_data = req.app.locals.serializer.serializeError(e)
        res.status(403).json(serialized_data)
    }
}

export function checkHasOrgAccess(user: any, requested_org) {
    if (!hasScope(user, scopes.VolubleAdmin) && user.organization != requested_org) {
        throw new ResourceOutOfUserScopeError(`User does not have access to the requested resource: ${requested_org}`)
    }
}

export function hasScope(user: any, scope: string) {
    return user.scope.split(' '.indexOf(scope) > -1)
}