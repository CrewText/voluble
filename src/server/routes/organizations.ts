import * as express from "express";
import { OrgManager } from "../../org-manager";
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { checkUserOrganization, scopes } from '../security/scopes';
const router = express.Router();
const errs = require('common-errors')
router.use(checkJwt, checkJwtErr)

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


router.get('/:org_id', checkScopes([scopes.OrganizationOwner, scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {
    let org_id = req.params.org_id
    // Check the req'er is either an admin, or part of the org
    if (req.user.scope.split(' ').indexOf(scopes.VolubleAdmin) > -1 || req.user.organization == org_id) {
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
    } else {
        res.status(403).jsend.fail(`User is not allowed access to this resource.`)
    }
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

/**
 * Get a list of Users in the Organization.
 */
router.get('/:org_id/users', checkScopes([scopes.UserView,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

})

/**
 * Creates an new user and adds them to an Organization.
 */
router.post('/:org_id/users', checkScopes([scopes.UserAdd,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

})

/**
 * Adds an existing user to an Organization.
 */
router.put('/:org_id/users', checkScopes([scopes.UserAdd,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

})

/** Removes an Organization */
router.delete('/:org_id', checkScopes([scopes.OrganizationOwner,
scopes.OrganizationDelete,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {
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
 * Get info about a User in the Organization
 */
router.get('/:org_id/users/:user_id', checkScopes([scopes.UserView,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

})

/**
 * Removes an existing user from an Organization.
 */
router.delete('/:org_id/users/:user_id', checkScopes([scopes.UserDelete,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

})

module.exports = router