import * as express from "express";
import { random } from 'faker';
import validator from "validator";
import { PlanTypes, scopes } from "voluble-common";
import * as winston from 'winston';
import { Organization } from "../../models/organization";
import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
import { getE164PhoneNumber } from '../../utilities';
import { AuthorizationFailedError, InvalidParameterValueError, ResourceNotFoundError, ResourceOutOfUserScopeError, UserAlreadyInOrgError } from '../../voluble-errors';
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccessMiddleware, hasScope, setupUserOrganizationMiddleware } from '../security/scopes';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'OrgsRoute' })
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
    function (req, res: express.Response, next) {
        if (req['user'].scope.split(' ').indexOf(scopes.VolubleAdmin) > -1) {
            OrgManager.getAllOrganizations()
                .then(orgs => {
                    return req.app.locals.serializer.serializeAsync('organization', orgs)
                })
                .then(function (serialized) {
                    res.status(200).json(serialized)
                })
                .catch((e) => {
                    let serialized_err = req.app.locals.serializer.serializeError(e)
                    res.status(500).json(serialized_err)
                })
        } else {
            OrgManager.getOrganizationById(req['user'].organization)
                .then(org => {
                    return req.app.locals.serializer.serializeAsync('organization', org)
                })
                .then(function (serialized) {
                    // Wrap the returned Org in an array, so regardless of the admin status, the return type
                    // will be an Array
                    res.status(200).json(serialized)
                })
                .catch((e) => {
                    let serialized_err = req.app.locals.serializer.serializeError(e)
                    res.status(500).json(serialized_err)
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
router.post('/', checkJwt, async function (req, res, next) {
    if (req['user'] && req['user'].organization) {
        throw new UserAlreadyInOrgError(`User is already a member of Organization ${req['user'].organization}`)
    }

    if (!req['user']) {
        throw new AuthorizationFailedError(`No user found in JWT; an Organization cannot be created`)
    }

    let org_name = req.body.name
    let org_phone_number = req.body.phone_number
    let plan_type = req.body.plan.toUpperCase()
    new Promise((res, rej) => {
        res(checkExtendsModel(req.body, Organization))
    })
        .then(() => {
            try { return getE164PhoneNumber(org_phone_number) }
            catch { throw new InvalidParameterValueError(`Phone number supplied is invalid: ${org_phone_number}`) }
        })
        .then(e164_phone_num => {
            return Promise.all([OrgManager.createNewOrganization(org_name, e164_phone_num, plan_type),
            UserManager.createUser(req['user'].sub == `${process.env.AUTH0_TEST_CLIENT_ID}@clients` ? random.uuid() : req['user'].sub)])
        })
        .then(([new_org, new_user]) => {
            logger.debug(`Created new Organization`, { 'org': new_org.id })
            logger.debug(`Created new User in Organization`, { 'org': new_org.id, 'user': new_user.id });
            return new_org.addUser(new_user)
                .then(() => {
                    if (req['user'].sub == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
                        logger.debug(`Created by test client, not setting user claim`, { 'user': new_user.id })
                        return
                    }
                    else {
                        logger.debug('Setting user scope organization:owner', { 'user': new_user.id })
                        return UserManager.setUserScopes(new_user.id, [scopes.OrganizationOwner])
                    }
                })
                .then(() => {
                    return new_org.reload()
                })
        })
        .then(new_org => {
            return req.app.locals.serializer.serializeAsync('organization', new_org)
        })
        .then(serialized => {
            res.status(201).json(serialized)
        })
        .catch(e => {
            let serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof InvalidParameterValueError) {
                res.status(400).json(serialized_err)
                logger.debug(e)
            } else if (e instanceof UserAlreadyInOrgError) {
                res.status(400).json(serialized_err)
                logger.debug(e)
            } else if (e instanceof AuthorizationFailedError) {
                res.status(401).json(serialized_err)
                logger.debug(e)
            }
            else {
                res.status(500).json(serialized_err)
                logger.error(e)
            }
        })
})


router.get('/:org_id',
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware, function (req, res, _next) {

        let org_id = req.params.org_id
        OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                if (!org) {
                    throw new ResourceNotFoundError(`Organization with ID ${org_id} does not exist`)
                } else {
                    return req.app.locals.serializer.serializeAsync('organization', org)
                }
            })
            .then(serialized => {
                res.status(200).json(serialized)
            })
            .catch(function (e) {
                let serialized_err = req.app.locals.serializer.serializeError(e)
                if (e instanceof ResourceNotFoundError) { res.status(400).json(serialized_err) }
                else {
                    res.status(500).json(serialized_err)
                    logger.error(e)
                }
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
    checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.OrganizationEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    async function (req, res, next) {
        let org_id = req.params.org_id
        let new_org_data = req.body

        if (!new_org_data) { throw new InvalidParameterValueError(`Request body must not be empty`) }
        OrgManager.getOrganizationById(org_id)
            .then(org => {
                if (!org) { throw new ResourceNotFoundError(`Resource not found: ${org_id}`) }

                if (new_org_data.name) {
                    org.set("name", new_org_data.name)
                }

                if (new_org_data.phone_number) {
                    let parsed_phone_num: string
                    try {
                        parsed_phone_num = getE164PhoneNumber(new_org_data.phone_number)
                    } catch {
                        throw new InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + req.body.phone_number)
                    }

                    org.set("phone_number", parsed_phone_num)
                }

                if (new_org_data.plan) {
                    if (!hasScope(req['user'], [scopes.OrganizationEdit, scopes.OrganizationOwner, scopes.VolubleAdmin])) { throw new ResourceOutOfUserScopeError(`This user cannot alter parameter 'plan'`) }
                    if (!(new_org_data.plan in PlanTypes)) { throw new InvalidParameterValueError(`Parameter 'plan' must be one of the following: ${Object.values(PlanTypes)}`) }
                    org.plan = new_org_data.plan.toUpperCase()
                }

                if (new_org_data.credits) {
                    if (!hasScope(req['user'], [scopes.CreditsUpdate, scopes.OrganizationOwner, scopes.VolubleAdmin])) { throw new ResourceOutOfUserScopeError(`This user cannot alter parameter 'credits'`) }
                    if (typeof new_org_data.credits != "number" || (typeof new_org_data.credits == "string" && validator.isInt(new_org_data.credits)) || new_org_data.credits < 0) { throw new InvalidParameterValueError(`Parameter 'credits' must be a number above zero`) }
                    org.set("credits", new_org_data.credits)
                }
                return org.save()
            })
            .then(org => { return org.reload() })
            .then(org => { return req.app.locals.serializer.serializeAsync('organization', org) })
            .then(serialized => {
                res.status(200).json(serialized)
            })
            .catch(e => {
                let serialized_err = req.app.locals.serializer.serializeError(e)
                if (e instanceof ResourceOutOfUserScopeError) {
                    res.status(403).json(serialized_err)
                } else if (e instanceof InvalidParameterValueError) {
                    res.status(400).json(serialized_err)
                } else if (e instanceof ResourceNotFoundError) {
                    res.status(404).json(serialized_err)
                } else {
                    res.status(500).json(serialized_err)
                    logger.error(e)
                }
            })
    })


/** Removes an Organization */
router.delete('/:org_id', checkJwt,
    checkScopesMiddleware([scopes.OrganizationOwner,
    scopes.OrganizationDelete,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    function (req, res, next) {
        let org_id = req.params.org_id
        OrgManager.getOrganizationById(org_id)
            .then((org) => {
                if (!org) {
                    return res.status(404).json({})
                }

                // TODO: Delete SCs, Messages, Contacts, too?
                org.destroy()
                    .then(() => {
                        return res.status(204).json({})
                    })
                    .catch((e) => {
                        let serialized_err = req.app.locals.serializer.serializeError(e)
                        return res.status(500).json(serialized_err)
                    })
            })
    })

module.exports = router