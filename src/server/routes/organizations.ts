import * as Promise from 'bluebird';
import * as express from "express";
import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
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

let UserNotInOrgError = errs.helpers.generateClass("UserNotInOrgError", { extends: errs.NotFoundError })

/**
 * 
 * @api {get} /orgs Get list of Organizations
 * @apiName GetOrgs
 * @apiGroup Orgs
 * 
 * @apiSuccess (200) {json} data[] A list of Organizations that this User/Client has access to
 * 
 * @apiSuccessExample {json} Success-Response:
 * {
 *     data : [
 *         {
 *             id: d8ec4c40-c8f1-4807-af9a-3cc03ecdf3ce
 *             name: Organization_Name
 *         }
 *         ...
 *     ]
 * }
 * 
 * 
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

/**
 * 
 * @api {post} /orgs CreateOrg
 * @apiName PostOrgs
 * @apiGroup Orgs
 * 
 * @apiParam  {String} name The name of the new Organization
 * @apiParam  {String} phone_number A phone number that the Organization will use to send SMSes on your behalf in international format
 * 
 * @apiSuccess (201) {json} data The Organization that has been created.
 * 
 * @apiParamExample  {json} Request-Example:
 * {
 *     name : "My Organization Ltd"
 *     phone_number: "+447123456789"
 * }
 * 
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *     data : {
 *         id: "418505ce-5837-4052-bb46-7337feb922b9"
 *         name : "My Organization Ltd"
 *         phone_number: "+447123456789" 
 *     }
 * }
 * 
 * 
 */
router.post('/', checkUserOrganization, function (req, res, next) {
    if (req.user.organization) {
        res.status(400).jsend.fail(`User is already a member of Organization ${req.user.organization}`)
        return
    }

    let org_name = req.body.name
    let org_phone_number = req.body.phone_number
    OrgManager.createNewOrganization(org_name, org_phone_number)
        .then(function (new_org) {
            res.status(201).jsend.success(new_org)
        })
        .catch(errs.ArgumentNullError, errs.ValidationError, function (err) {
            // An Org parameter hasn't been provided or is wrong
            res.status(400).jsend.fail(err)
        })
        .catch(function (err) {
            res.status(500).jsend.error(err)
        })
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
 * 
 * @api {put} /orgs/:org_id Update an Organization's data
 * @apiName PutOrgsOrg
 * @apiGroup Orgs
 * 
 * @apiParam  {String} org_id The ID of the Organization to update
 * @apiParam  {Object} Organization An object representing the data to update
 * @apiParam  {String} [Organization.name] The new name for the Organizaion
 * @apiParam  {String} [Organization.phone_number] The new phone number for the Organization
 * 
 * @apiSuccess (200) {json} Organization The updated Organization
 * 
 * @apiParamExample  {json} Request-Example:
 * {
 *     Organization:
 *         {
 *             name: "MyCorp Ltd."
 *             phone_number: "+447123456789"
 *         }
 * }
 * 
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *     data:
 *         {
 *                 id: "3c39574c-a4d3-464c-918a-d85713685f3b",
 *                 name: "MyCorp Ltd."
 *                 phone_number: "+447123456789"
 *         }
 * }
 * 
 * 
 */

router.put('/:org_id',
    checkScopes([scopes.OrganizationOwner, scopes.OrganizationEdit, scopes.VolubleAdmin]),
    checkJwt,
    checkJwtErr,
    checkUserOrganization,
    checkHasOrgAccess,
    function (req, res, next) {
        let org_id = req.params.org_id
        let new_org_data = req.body.Organization

        if (!new_org_data) {
            throw new errs.ArgumentNullError(`Parameter Organization not supplied`)
        }

        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) { throw new errs.NotFoundError(`Organization with ID ${org_id} does not exist`) }
                return Promise.map(Object.keys(new_org_data), function (key, index, length) {
                    return org[key] = new_org_data[key]
                })
                    .then(function () {
                        org.name = new_org_data.name
                        return org.save()
                    })
            })
            .then(function (org) {
                res.status(200).jsend.success(org)
            })
            .catch(errs.ArgumentNullError, errs.ValidationError, function (err) {
                res.status(400).jsend.fail(err)
            })
            .catch(errs.NotFoundError, function (err) {
                res.status(404).jsend.fail(err)
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
 * 
 * @api {put} /orgs/:org_id/users Add user to Organization
 * @apiName PutOrgsUsers
 * @apiGroup OrgsUsers
 * 
 * 
 * @apiParam  {string} org_id The ID of the Organization to add a user to
 * @apiParam  {string} user_id The ID of the User to add to the Organization
 * 
 * @apiSuccess (200) {User} data The User, after being added to the Organization
 * 
 * @apiParamExample  {json} Request-Example:
 * {
 *     user_id : "a0e77f72-2415-462b-9526-af87dbed2ee4"
 * }
 * 
 * 
 * @apiSuccessExample {json} Success-Response:
 * {
 *     id : "a0e77f72-2415-462b-9526-af87dbed2ee4",
 *     OrganizationId: "c26399b7-d6ad-481f-bb7c-16add635323d",
 *     auth0_id: "6d66f919-f7e2-4485-a913-0f2c0d52e5bc"
 * }
 * 
 * 
 */
router.put('/:org_id/users', checkScopes([scopes.UserAdd, scopes.OrganizationEdit,
scopes.OrganizationOwner, scopes.VolubleAdmin]),
    checkUserOrganization,
    checkHasOrgAccess,
    function (req, res, next) {
        let org_id = req.params.org_id
        let user_id = req.body.user_id

        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) { throw new errs.NotFoundError(`Organization with ID ${org_id} not found`) }
                return UserManager.getUserById(user_id)
                    .then(function (user) {
                        return org.hasUser(user)
                            .then(function (has_user) {
                                if (has_user) {
                                    throw new errs.AlreadyInUseError(`User is already in Organization`)
                                }
                                return user
                            })
                    })
            })
            .then(function (user) {
                return user.setOrganization(org_id)
                    .then(function () {
                        return UserManager.getUserById(user_id)
                    })
            })
            .then(function (user) {
                res.status(200).jsend.success(user)
            })
            .catch(errs.AlreadyInUseError, function (err) {
                // Get the user and send it back as success, to ensure idempotence
                UserManager.getUserById(user_id)
                    .then(function (user) {
                        res.status(200).jsend.success(user)
                    })
            })
            .catch(errs.NotFoundError, function (err) {
                res.status(404).jsend.fail(err)
            })
            .catch(function (err) {
                res.status(500).jsend.error(err)
            })
    })


/**
 * Get info about a User in the Organization
 */
router.get('/:org_id/users/:user_id',
    checkScopes([scopes.UserView, scopes.OrganizationEdit, scopes.OrganizationOwner, scopes.VolubleAdmin]),
    checkUserOrganization,
    checkHasOrgAccess,
    function (req, res, next) {
        let org_id = req.params.org_id
        let user_id = req.params.user_id

        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) { throw new errs.NotFoundError(`Organization with ID ${org_id} not found`) }

                return org.hasUser(user_id)
                    .then(function (has_user) {
                        if (!has_user) {
                            throw new UserNotInOrgError(`User ${user_id} does not exist in Organization ${org_id}`)
                        }
                        return org.getUsers({
                            where: {
                                id: user_id
                            }
                        })
                    })
            })
            .then(function (users) {
                res.status(200).jsend.success(users[0])
            })
            .catch(UserNotInOrgError, errs.NotFoundError, function (err) {
                res.status(404).jsend.fail(err)
            })
            .catch(function (err) {
                res.status(500).jsend.error(err)
            })
    })

/**
 * Removes an existing user from an Organization.
 */
router.delete('/:org_id/users/:user_id', checkScopes([scopes.UserDelete,
scopes.OrganizationEdit,
scopes.OrganizationOwner,
scopes.VolubleAdmin]), checkUserOrganization, checkHasOrgAccess, function (req, res, next) {
    let org_id = req.params.org_id
    let user_id = req.params.user_id

    UserManager.getUserById(user_id)
        .then(function (user) {
            if (!user) { throw new errs.NotFoundError(`The user ${user_id} does not exist`) }

            return user.destroy()
        })
        .then(function () {
            res.status(200).jsend.success(true)
        })
        .catch(errs.NotFoundError, function (err) {
            // Return success to ensure idempotence
            res.status(404).jsend.success(true)
        })
        .catch(function (err) {
            res.status(500).jsend.error(err)
        })
})

module.exports = router