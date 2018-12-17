import * as express from "express";
import { OrgManager } from "../../org-manager";
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { checkUserOrganization, scopes } from '../security/scopes';
import winston = require("winston");
const router = express.Router();
const errs = require('common-errors')
router.use(checkJwt, checkJwtErr)

function checkHasOrgAccess(req, res, next) {
    if (req.user.scope.split(' ').indexOf(scopes.VolubleAdmin) < 0 && req.user.organization != req.params.org_id) {
        res.status(403).jsend.fail("User does not have access to this resource")
    } else { next() }
}

/**
 * Get a list of all of the organizations that the person is authorized to see.
 */
router.get('/', checkScopes([scopes.OrganizationOwner, scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {
    if (req.user.scope.split(' ').indexOf(scopes.VolubleAdmin) > -1) {
        OrgManager.getAllOrganizations()
            .then(function (organizations) {
                res.status(200).jsend.success(organizations)
            })
            .catch((err) => {
                res.status(500).jsend.error(err)
            })
    } else {
        OrgManager.getOrganizationById(req.user.organization)
            .then(function (org) {
                // Wrap the returned Org in an array, so regardless of the admin status, the return type
                // will be an Array
                res.status(200).jsend.success([org])
            })
            .catch((err) => {
                res.status(500).jsend.error(err)
            })
    }
})


router.get('/:org_id', checkScopes([scopes.OrganizationOwner, scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {
    let org_id = req.params.org_id

    //if (req.user.scope.split(' ').indexOf(scopes.VolubleAdmin) > -1 || req.user.organization == org_id) {
    // The req'er is authorised to know about this org
    OrgManager.getOrganizationById(org_id)
        .then(function (org) {
            if (!org) {
                res.status(400).jsend.fail(`Organization with ID ${org_id} does not exist`)
            } else {
                res.status(200).jsend.success(org)
            }
        })
        .catch(function (err) {
            res.status(500).jsend.error(err)
        })

})


/**
 * Create a new organization. This needs parameters:
 * @param name
 */
router.post('/', checkUserOrganization, function (req, res, next) {
    if (req.user.organization) {
        res.status(400).jsend.fail(`User is already a member of Organization ${req.user.organization}`)
        return
    }

    let org_name = req.body.name
    OrgManager.createNewOrganization(org_name)
        .then(function (new_org) {
            res.status(201).jsend.success(new_org)
        })
        .catch(errs.ArgumentNullError, function (err) {
            // An Org name hasn't been provided
            res.status(400).jsend.fail(err)
        })
        .catch(function (err) {
            res.status(500).jsend.error(err)
        })
})


/** Removes an Organization */
router.delete('/:org_id', checkScopes([scopes.OrganizationOwner,
scopes.OrganizationDelete,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {
    let org_id = req.params.org_id
    OrgManager.getOrganizationById(org_id)
        .then((org) => {
            if (!org) {
                return res.status(404).jsend.success(true)
            }

            // TODO: Delete SCs, Messages, Contacts, too?
            org.destroy()
                .then(() => {
                    return res.status(200).jsend.success(true)
                })
                .catch((err) => {
                    return res.status(500).jsend.error(err)
                })
        })
})

/**
 * @api {get} /orgs/:org_id/users Get a list of Users in the Org
 * @apiName GetOrgsUsers
 * @apiGroup OrgsUsers
 * 
 * @apiParam {UUID} org_id The ID of the Organization to get the Users from
 * 
 * @apiSuccess {User[]} data Array of Users
 */
router.get('/:org_id/users', checkScopes([scopes.UserView,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {
    let org_id = req.params.org_id
    OrgManager.getOrganizationById(org_id)
        .then(function (org) {
            if (!org) {
                throw new errs.NotFoundError(`Organization with ID ${org_id} does not exist`)
            }
            return org.getUsers()
        })
        .then(function (users) {
            res.status(200).jsend.success(users)
        })
        .catch(errs.NotFoundError, function (err) {
            res.status(404).jsend.fail(err)
        })
        .catch(function (err) {
            res.status(500).jsend.error(err)
        })
})

/**
 * @api {post} /orgs/:org_id/users Create a new User for the Org
 * @apiName PostOrgsUsers
 * @apiGroup OrgsUsers
 * 
 * @apiParam {UUID} org_id The ID of the Organization to add the new User to
 * @apiSuccess (201 Created) {User} data The newly-created User
 */
router.post('/:org_id/users', checkScopes([scopes.UserAdd,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {
    let org_id = req.params.org_id
    let new_user_auth0_id = req.body.auth0_id

    if (!org_id) {
        return res.status(404).jsend.fail(`Organization with ID ${org_id} does not exist`)
    } else if (!new_user_auth0_id) {
        return res.status(400).jsend.fail(`Parameter 'auth0_id' not specified`)
    }

    OrgManager.getOrganizationById(org_id)
        .then(function (org) {
            if (!org) {
                return Promise.reject(new errs.NotFoundError(`No Organization found with ID ${org_id}`))
            }
            return org.createUser({ auth0_id: new_user_auth0_id })
        })
        .then(function (user) {
            res.status(201).jsend.success(user)
        })
        .catch(errs.NotFoundError, (err) => {
            res.status(404).jsend.fail(err)
        })
        .catch((err) => {
            winston.error(err.message)
            res.status(500).jsend.error(err)
        })
})

/**
 * Adds an existing user to an Organization.
 */
router.put('/:org_id/users', checkScopes([scopes.UserAdd,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {

})


/**
 * Get info about a User in the Organization
 */
router.get('/:org_id/users/:user_id', checkScopes([scopes.UserView,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {

})

/**
 * Removes an existing user from an Organization.
 */
router.delete('/:org_id/users/:user_id', checkScopes([scopes.UserDelete,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {

})

module.exports = router