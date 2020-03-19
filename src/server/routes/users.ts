import * as express from "express";
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
import { ResourceNotFoundError, UserAlreadyInOrgError, UserNotInOrgError } from '../../voluble-errors';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccessMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'OrgsRoute' })
const router = express.Router();

/**
 * @api {get} /orgs/:org_id/users Get a list of Users in the Org
 * @apiName GetOrgsUsers
 * @apiGroup OrgsUsers
 * 
 * @apiParam {UUID} org_id The ID of the Organization to get the Users from
 * 
 * @apiSuccess {User[]} data Array of Users
 */
router.get('/:org_id/users', checkJwt,

    checkScopesMiddleware([scopes.UserView,
    scopes.OrganizationEdit,
    scopes.OrganizationOwner,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, function (req, res, next) {
        let org_id = req.params.org_id
        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) {
                    throw new ResourceNotFoundError(`Organization with ID ${org_id} does not exist`)
                }
                return org.getUsers()
            })
            .then(function (users) {
                res.status(200).jsend.success(users)
            })
            .catch(ResourceNotFoundError, function (err) {
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
router.post('/:org_id/users',
    checkJwt,

    checkScopesMiddleware([scopes.UserAdd,
    scopes.OrganizationEdit,
    scopes.OrganizationOwner,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, async function (req, res, next) {
        let org_id = req.params.org_id
        let new_user_id = req.body.id

        if (!org_id) {
            return res.status(404).jsend.fail(`Organization with ID ${org_id} does not exist`)
        } else if (!new_user_id) {
            return res.status(400).jsend.fail(`Parameter 'id' not specified`)
        }

        try {
            let org = await OrgManager.getOrganizationById(org_id)
            if (!org) { throw new ResourceNotFoundError(`No Organization found with ID ${org_id}`) }

            org.createUser({ id: new_user_id })
        } catch (e) {
            if (e instanceof ResourceNotFoundError) {
                logger.warn(e)
                res.status(404).jsend.fail(e.message)
                res.status(500).jsend.error(e.message)
                logger.error(e)
            }
        }
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
 *     OrganizationId: "c26399b7-d6ad-481f-bb7c-16add635323d",
 *     id: "6d66f919-f7e2-4485-a913-0f2c0d52e5bc"
 * }
 * 
 * 
 */
router.put('/:org_id/users', checkJwt,

    checkScopesMiddleware([scopes.UserAdd, scopes.OrganizationEdit,
    scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    function (req, res, next) {
        let org_id = req.params.org_id
        let user_id = req.body.user_id

        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) { throw new ResourceNotFoundError(`Organization with ID ${org_id} not found`) }
                return UserManager.getUserById(user_id)
                    .then(function (user) {
                        return org.hasUser(user)
                            .then(function (has_user) {
                                if (has_user) {
                                    throw new UserAlreadyInOrgError(`User is already in Organization`)
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
            .catch(UserAlreadyInOrgError, function (err) {
                // Get the user and send it back as success, to ensure idempotence
                UserManager.getUserById(user_id)
                    .then(function (user) {
                        res.status(200).jsend.success(user)
                    })
            })
            .catch(ResourceNotFoundError, function (err) {
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
    checkJwt,

    checkScopesMiddleware([scopes.UserView, scopes.OrganizationEdit, scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    function (req, res, next) {
        let org_id = req.params.org_id
        let user_id = req.params.user_id

        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) { throw new ResourceNotFoundError(`Organization with ID ${org_id} not found`) }

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
            .catch(UserNotInOrgError, ResourceNotFoundError, function (err) {
                res.status(404).jsend.fail(err)
            })
            .catch(function (err) {
                res.status(500).jsend.error(err)
            })
    })

/**
 * Removes an existing user from an Organization.
 */
router.delete('/:org_id/users/:user_id',
    checkJwt,

    checkScopesMiddleware([scopes.UserDelete,
    scopes.OrganizationEdit,
    scopes.OrganizationOwner,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, function (req, res, next) {
        let org_id = req.params.org_id
        let user_id = req.params.user_id

        UserManager.getUserById(user_id)
            .then(function (user) {
                if (!user) { throw new ResourceNotFoundError(`The user ${user_id} does not exist`) }

                return user.destroy()
            })
            .then(function () {
                res.status(200).jsend.success(true)
            })
            .catch(ResourceNotFoundError, function (err) {
                // Return success to ensure idempotence
                res.status(404).jsend.success(true)
            })
            .catch(function (err) {
                res.status(500).jsend.error(err)
            })
    })

module.exports = router