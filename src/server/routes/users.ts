import * as express from "express";
import { errors, scopes } from "voluble-common";

import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccessMiddleware, checkScopesMiddleware, setupUserOrganizationMiddleware } from "../security/scopes";

//const logger = winston.loggers.get(process.title).child({ module: 'UsersRoute' })
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
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware,
    async (req, res, next) => {
        const org_id = req.params.org_id

        try {
            const org = await OrgManager.getOrganizationById(org_id)

            if (!org) { throw new errors.ResourceNotFoundError(`Organization with ID ${org_id} does not exist`) }
            const users = await org.getUsers()

            res.status(200).json(req.app.locals.serializer.serialize('user', users))
            return next()
        }
        catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else { throw e }
        }
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
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, async (req, res, next) => {
        const org_id = req.params.org_id
        const new_user_id = req.body.id

        if (!new_user_id) {
            throw new errors.InvalidParameterValueError(`Parameter 'id' not specified`)
        }

        try {
            const org = await OrgManager.getOrganizationById(org_id)
            if (!org) { throw new errors.ResourceNotFoundError(`No Organization found with ID ${org_id}`) }

            const user = await org.createUser({ id: new_user_id })
            const serialized = req.app.locals.serializer.serializeAsync('user', user)
            res.status(201).json(serialized)
            return next()

        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof errors.InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            } else { throw e }
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
// router.put('/:org_id/users', checkJwt,

//     checkScopesMiddleware([scopes.UserAdd, scopes.OrganizationEdit,
//     scopes.OrganizationOwner, scopes.VolubleAdmin]),
//     setupUserOrganizationMiddleware,
//     checkHasOrgAccessMiddleware,
//     (req, res ,next)=> {
//         let org_id = req.params.org_id
//         let user_id = req.body.user_id

//         OrgManager.getOrganizationById(org_id)
//             .then(function (org) {
//                 if (!org) { throw new errors.ResourceNotFoundError(`Organization with ID ${org_id} not found`) }
//                 return UserManager.getUserById(user_id)
//                     .then(function (user) {
//                         return org.hasUser(user)
//                             .then(function (has_user) {
//                                 if (has_user) {
//                                     throw new errors.UserAlreadyInOrgError(`User is already in Organization`)
//                                 }
//                                 return user
//                             })
//                     })
//             })
//             .then(function (user) {
//                 return user.setOrganization(org_id)
//                     .then(function () {
//                         return UserManager.getUserById(user_id)
//                     })
//             })
//             .then(function (user) {
//                 res.status(200).jsend.success(user)
//             })
//             .catch(e=>{
//                 let serialized_err = req.app.locals.serializer.serializeError(e)
//             })
//             .catch(UserAlreadyInOrgError, function (err) {
//                 // Get the user and send it back as success, to ensure idempotence
//                 UserManager.getUserById(user_id)
//                     .then(function (user) {
//                         res.status(200).jsend.success(user)
//                     })
//             })
//             .catch(ResourceNotFoundError, function (err) {
//                 res.status(404).jsend.fail(err)
//             })
//             .catch(function (err) {
//                 res.status(500).jsend.error(err)
//             })
//     })


/**
 * Get info about a User in the Organization
 */
router.get('/:org_id/users/:user_id',
    checkJwt,
    checkScopesMiddleware([scopes.UserView, scopes.OrganizationEdit, scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    async (req, res, next) => {
        const org_id = req.params.org_id
        const user_id = req.params.user_id

        const org = await OrgManager.getOrganizationById(org_id)

        try {
            if (!org) { throw new errors.ResourceNotFoundError(`Organization with ID ${org_id} not found`) }

            if (!await org.hasUser(user_id)) { throw new errors.UserNotInOrgError(`User ${user_id} does not exist in Organization ${org_id}`) }

            const user = await org.getUsers({
                where: { id: user_id }
            })

            res.status(200).json(req.app.locals.serializer.serialize('user', user))
            return next()

        } catch (e) {
            if (e instanceof errors.UserNotInOrgError || e instanceof errors.ResourceNotFoundError) {
                const serialized_err = req.app.locals.serializer.serializeError(e)
                res.status(400).json(serialized_err)
            } else { throw e }
        }
    })

/**
 * Removes an existing user from an Organization.
 */
router.delete('/:org_id/users/:user_id',
    checkJwt,
    checkScopesMiddleware([scopes.UserDelete,
    scopes.OrganizationEdit,
    scopes.OrganizationOwner,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware,
    async (req, res, next) => {
        const user_id = req.params.user_id

        try {
            const user = await UserManager.getUserById(user_id)
            if (!user) { throw new errors.ResourceNotFoundError(`The user ${user_id} does not exist`) }

            await user.destroy()
            res.status(204).json({})
            return next()
        }
        catch (e) {
            if (e instanceof errors.ResourceNotFoundError) { res.status(404).json({}); return } else { throw e }
        }
    })

export default router