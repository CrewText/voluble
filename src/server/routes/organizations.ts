import * as express from "express";
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { OrgManager } from "../../org-manager";
import { UserManager } from "../../user-manager";
import { getE164PhoneNumber } from '../../utilities';
import { InvalidParameterValueError, ResourceNotFoundError } from '../../voluble-errors';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, ResourceOutOfUserScopeError, setupUserOrganizationMiddleware } from '../security/scopes';
import { checkExtendsModel } from "../helpers/check_extends_model";
import { Organization } from "../../models/organization";
import { random } from 'faker'

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
    checkScopesMiddleware([scopes.OrganizationOwner, scopes.VolubleAdmin]), setupUserOrganizationMiddleware, function (req, res: express.Response, next) {
        if (req['user'].scope.split(' ').indexOf(scopes.VolubleAdmin) > -1) {
            OrgManager.getAllOrganizations()
                .then(function (organizations) {
                    res.status(200).jsend.success(organizations)
                })
                .catch((err) => {
                    res.status(500).jsend.error(err)
                })
        } else {
            OrgManager.getOrganizationById(req['user'].organization)
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
router.post('/', checkJwt, async function (req, res, next) {
    if (req['user'] && req['user'].organization) {
        res.status(400).jsend.fail(`User is already a member of Organization ${req['user'].organization}`)
        return
    }

    if (!req['user']) {
        res.status(401).jsend.fail(`No user found in JWT; an Organization cannot be created`)
        return
    }

    let org_name = req.body.name
    let org_phone_number = req.body.phone_number
    try {
        checkExtendsModel(req.body, Organization)
        // if (!org_name) {
        //     throw new InvalidParameterValueError("Organization name has not been provided")
        // } else if (!org_phone_number) {
        //     throw new InvalidParameterValueError("Organization phone number has not been provided")
        // }

        let e164_phone_num: string
        try { e164_phone_num = getE164PhoneNumber(org_phone_number) }
        catch{
            throw new InvalidParameterValueError(`Phone number supplied is invalid: ${org_phone_number}`)
        }

        await Promise.all([OrgManager.createNewOrganization(org_name, e164_phone_num),
        UserManager.createUser(req['user'].sub == `${process.env.AUTH0_TEST_CLIENT_ID}@clients` ? random.uuid() : req['user'].sub)])
            .then(async ([new_org, new_user]) => {
                // console.log(new_user)
                // console.log(new_org)
                // await new_user.setOrganization(new_org)
                // new_user.OrganizationId = new_org.id
                // await new_user.save()
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
                    .then(async () => {
                        res.status(201).jsend.success(await new_org.reload())
                    })
            })
    } catch (e) {
        if (e instanceof InvalidParameterValueError) {
            // logger.warn(e.message)
            res.status(400).jsend.fail(e.message)
        } else {
            logger.error(e)
            res.status(500).jsend.error(e.message)
        }
    }
})


router.get('/:org_id',
    checkJwt,

    checkScopesMiddleware([scopes.OrganizationOwner, scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, function (req, res, next) {
        let org_id = req.params.org_id

        //if (req['user'].scope.split(' ').indexOf(scopes.VolubleAdmin) > -1 || req['user'].organization == org_id) {
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
    checkJwt,

    checkScopesMiddleware([scopes.OrganizationOwner, scopes.OrganizationEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    checkHasOrgAccessMiddleware,
    async function (req, res, next) {

        try {
            let org_id = req.params.org_id
            let new_org_data = req.body

            checkHasOrgAccess(req['user'], org_id)

            if (!new_org_data) { throw new InvalidParameterValueError(`Request body must not be empty`) }

            let org = await OrgManager.getOrganizationById(org_id)
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

            await org.save()
            res.status(200).jsend.success(await org.reload())

        } catch (e) {
            if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).jsend.fail(e.message)
            } else if (e instanceof InvalidParameterValueError) {
                res.status(400).jsend.fail(e.message)
            } else if (e instanceof ResourceNotFoundError) {
                res.status(404).jsend.fail(e.message)
            } else {
                logger.error(`${e.name}: ${e.message}`)
                res.status(500).jsend.error(e.message)
            }
        }
    })


/** Removes an Organization */
router.delete('/:org_id', checkJwt,

    checkScopesMiddleware([scopes.OrganizationOwner,
    scopes.OrganizationDelete,
    scopes.VolubleAdmin]), setupUserOrganizationMiddleware, checkHasOrgAccessMiddleware, function (req, res, next) {
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

module.exports = router