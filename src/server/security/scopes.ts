import { UserManager } from "../../user-manager";
const errs = require('common-errors')

export enum scopes {
    ContactAdd = "contact:add",
    ContactView = "contact:view",
    ContactEdit = "contact:edit",
    ContactDelete = "contact:delete",
    MessageRead = "message:read",
    MessageSend = "message:send",
    BlastSend = "blast:send",
    UserAdd = "user:add",
    UserEdit = "user:edit",
    UserDelete = "user:delete",
    UserView = "user:view",
    OrganizationEdit = "organization:edit",
    OrganizationDelete = "organization:delete",
    OrganizationOwner = "organization:owner",
    ServiceView = "service:view",
    ServicechainView = "servicechain:view",
    ServicechainAdd = "servicechain:add",
    ServicechainDelete = "servicechain:delete",
    ServicechainEdit = "servicechain:edit",
    VolubleAdmin = "voluble:admin"
}

export function checkUserOrganization(req, res, next) {
    let sub_id = req.user.sub
    if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
        next() // test client, let it do everything
    } else {
        UserManager.getUserFromAuth0Id(sub_id)
            .then(function (user) {
                if (!user) {
                    res.status(400).jsend.fail(new errs.NotFoundError(`Auth0 user specified in JWT ${sub_id} does not exist`))
                }
                return user.getOrganization()
            })
            .then(function (org) {
                req.user.organization = org.id
                next()
            })
    }
}