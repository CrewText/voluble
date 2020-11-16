import * as express from "express";
import validator from "validator";
import { errors, Org, PlanTypes, scopes } from "voluble-common";
import * as winston from 'winston';

import { Organization } from "../../models/organization";
import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
import { getE164PhoneNumber } from '../../utilities';
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccessParamMiddleware, checkScopesMiddleware, hasScope, setupUserOrganizationMiddleware } from '../security/scopes';

const logger = winston.loggers.get(process.title).child({ module: 'OrgsRoute' })
const router = express.Router();

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
router.get('/',
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    async (req, res: express.Response, next) => {
        if (req['user'].permissions.includes(scopes.VolubleAdmin)) {
            res.status(200).json(req.app.locals.serializer.serialize('organization', await OrgManager.getAllOrganizations()))
            return next()
        } else {
            const org = await OrgManager.getOrganizationById(req['user'].organization)
            // TODO: Wrap the returned Org in an array, so regardless of the admin status, the return type
            // will be an Array
            res.status(200).json(req.app.locals.serializer.serialize('organization', org))
            return next()
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
router.post('/',
    checkJwt,
    async (req, res, next) => {
        if (req['user'] && req['user'].organization) { throw new errors.UserAlreadyInOrgError(`User is already a member of Organization ${req['user'].organization}`) }
        if (!req['user']) { throw new errors.AuthorizationFailedError(`No user found in JWT; an Organization cannot be created`) }

        const org_name = req.body.name
        const org_phone_number = req.body.phone_number
        const plan_type = req.body.plan.toUpperCase()

        try {
            checkExtendsModel(req.body, Organization)

            let e164_phone_num: string = null
            try { e164_phone_num = getE164PhoneNumber(org_phone_number) }
            catch { throw new errors.InvalidParameterValueError(`Phone number supplied is invalid: ${org_phone_number}`) }

            const [new_org, new_user] = await Promise.all([
                OrgManager.createNewOrganization(org_name, e164_phone_num, plan_type),
                UserManager.createUser(req['user'].sub == `${process.env.AUTH0_TEST_CLIENT_ID}@clients` ? Math.random().toString(36).substring(2, 15) : req['user'].sub)
            ])
            logger.debug(`Created new Organization`, { 'org': new_org.id })
            logger.debug(`Created new User in Organization`, { 'org': new_org.id, 'user': new_user.id });

            const add_user_prom = new_org.addUser(new_user)

            if (req['user'].sub == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) { logger.debug(`Created by test client, not setting user claim`, { 'user': new_user.id }) }
            else {
                logger.debug('Setting user scope organization:owner', { 'user': new_user.id })
                await UserManager.setUserScopes(new_user.id, [scopes.OrganizationOwner])
            }

            await add_user_prom

            res.status(201).json(req.app.locals.serializer.serialize('organization', await new_org.reload()))
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.InvalidParameterValueError) {
                res.status(400).json(serialized_err)
                //                logger.debug(e)
            } else if (e instanceof errors.UserAlreadyInOrgError) {
                res.status(400).json(serialized_err)
                //               logger.debug(e)
            } else if (e instanceof errors.AuthorizationFailedError) {
                res.status(401).json(serialized_err)
                //             logger.debug(e)
            }
            else { next(e) }
        }
    })


router.get('/:org_id',
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {

        const org_id = req.params.org_id
        try {
            const org = await OrgManager.getOrganizationById(org_id)
            if (!org) { throw new errors.ResourceNotFoundError(`Organization with ID ${org_id} does not exist`) }
            res.status(200).json(req.app.locals.serializer.serialize('organization', org))
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) { res.status(400).json(serialized_err) }
            else { next(e) }
        }
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
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.OrganizationEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        const org_id = req.params.org_id
        const new_org_data = req.body

        try {
            if (!new_org_data) { throw new errors.InvalidParameterValueError(`Request body must not be empty`) }
            const org = await OrgManager.getOrganizationById(org_id)
            if (!org) { throw new errors.ResourceNotFoundError(`Resource not found: ${org_id}`) }

            const updates: Partial<Org> = {}

            if (new_org_data.name) {
                updates.name = new_org_data.name
            }

            if (new_org_data.phone_number) {
                let parsed_phone_num: string
                try { parsed_phone_num = getE164PhoneNumber(new_org_data.phone_number) }
                catch { throw new errors.InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + req.body.phone_number) }
                updates.phone_number = parsed_phone_num
            }

            if (new_org_data.plan) {
                if (!hasScope(req['user'], [scopes.OrganizationEdit, scopes.OrganizationOwner, scopes.VolubleAdmin])) { throw new errors.ResourceOutOfUserScopeError(`This user cannot alter parameter 'plan'`) }
                if (!(new_org_data.plan in PlanTypes)) { throw new errors.InvalidParameterValueError(`Parameter 'plan' must be one of the following: ${Object.values(PlanTypes)}`) }
                updates.plan = new_org_data.plan.toUpperCase()
            }

            if (new_org_data.credits) {
                if (!hasScope(req['user'], [scopes.CreditsUpdate, scopes.OrganizationOwner, scopes.VolubleAdmin])) { throw new errors.ResourceOutOfUserScopeError(`This user cannot alter parameter 'credits'`) }
                if (typeof new_org_data.credits != "number" || (typeof new_org_data.credits == "string" && validator.isInt(new_org_data.credits)) || new_org_data.credits < 0) { throw new errors.InvalidParameterValueError(`Parameter 'credits' must be a number above zero`) }
                updates.credits = new_org_data.credits
            }

            await OrgManager.updateOrganizationWithId(org.id, updates)
            await org.reload()

            res.status(200).json(req.app.locals.serializer.serialize('organization', org))
            return next()
        }
        catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof errors.InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            } else if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else { next(e) }
        }
    })


/** Removes an Organization */
router.delete('/:org_id',
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.OrganizationDelete, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessParamMiddleware('org_id'),
    async (req, res, next) => {
        const org_id = req.params.org_id
        const org = await OrgManager.getOrganizationById(org_id)

        if (!org) { return res.status(404).json({}) }

        // TODO: Delete SCs, Messages, Contacts, too?
        await org.destroy()
        res.status(204).json({})
        return next()
    })

export default router