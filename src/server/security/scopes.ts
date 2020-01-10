import { scopes } from "voluble-common";
import { UserManager } from "../../user-manager";
import { ResourceNotFoundError } from '../../voluble-errors';

export class ResourceOutOfUserScopeError extends Error { }

export function setupUserOrganizationMiddleware(req, res, next) {
    let sub_id = req.user.sub
    if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
        next() // test client, let it do everything
    } else {
        UserManager.getUserById(sub_id)
            .then(function (user) {
                if (!user) {
                    res.status(401).jsend.fail(new ResourceNotFoundError(`Auth0 user specified in JWT ${sub_id} does not exist`))
                }
                return user.getOrganization()
            })
            .then(function (org) {
                req.user.organization = org.id
                next()
            })
    }
}

export function checkHasOrgAccessMiddleware(req, res, next) {
    try {
        checkHasOrgAccess(req.user, req.params.org_id)
        next()
    }
    catch (e) {
        res.status(403).jsend.fail("User does not have access to this resource")
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