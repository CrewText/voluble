import * as express from "express";
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { CategoryManager } from "../../contact-manager";
import { Category } from "../../models/category";
import { OrgManager } from "../../org-manager";
import { InvalidParameterValueError, ResourceNotFoundError, ResourceOutOfUserScopeError } from "../../voluble-errors";
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkJwt, checkScopesMiddleware } from "../security/jwt";
import { checkHasOrgAccess, setupUserOrganizationMiddleware } from "../security/scopes";

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'CategoriesRoute' })
const router = express.Router();

router.get('/:org_id/categories', checkJwt,
    checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    async (req, res, next) => {

        try {
            checkHasOrgAccess(req['user'], req.params.org_id)
            let org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) {
                throw new ResourceNotFoundError(`Organization not found: ${req.params.org_id}`)
            }
            let cats = await org.getCategories()
            let data = await res.app.locals.serializer.serializeAsync('category', cats)
            res.status(200).json(data)
        }
        catch (e) {
            let serialized_err = res.app.locals.serializer.serializeError(e)
            if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof ResourceNotFoundError) { res.status(400).json(serialized_err) }
            else {
                logger.error(e.message)
                res.status(500).json(serialized_err)
            }

        }
    })

router.get('/:org_id/categories/count', checkJwt, checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
    (req, res, next) => {
        new Promise((res, rej) => {
            res(checkHasOrgAccess(req['user'], req.params.org_id))
        })
            .then(() => {
                return OrgManager.getOrganizationById(req.params.org_id)
            })
            .then(org => {
                return org.countCategories()
            })
            .then(c => {
                return res.status(200).json({ data: { count: c } })
            })
            .catch(e => {
                let serialized_err = res.app.locals.serializer.serializeError(e)
                if (e instanceof ResourceOutOfUserScopeError) {
                    res.status(403).json(serialized_err)
                }
                else if (e instanceof ResourceNotFoundError) {
                    res.status(400).json(serialized_err)
                }
                else {
                    logger.error(e.message)
                    res.status(500).json(serialized_err)
                }
            })
    })

router.post('/:org_id/categories', checkJwt,
    checkScopesMiddleware([scopes.CategoryAdd, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, _next) => {

        try {
            checkHasOrgAccess(req['user'], req.params.org_id)
            checkExtendsModel(req.body, Category)

            let org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) { throw new ResourceNotFoundError(`Organization not found: ${req.params.org_id}`) }
            let new_cat = await org.createCategory({
                name: req.body.name
            })

            req.app.locals.serializer.serializeAsync('category', new_cat)
                .then(serialized_data => { res.status(201).json(serialized_data) })
        } catch (e) {
            let serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            }
            else {
                logger.error(e)
                res.status(500).json(serialized_err)
            }
        }
    })

router.get('/:org_id/categories/:cat_id',
    checkJwt, checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                throw new ResourceNotFoundError(`Category ${req.params.cat_id} not found`)
            }
            checkHasOrgAccess(req['user'], req.params.org)

            let resp = await req.app.locals.serializer.serializeAsync('category', cat)
            res.status(200).json(resp)
        } catch (e) {
            let serialized_err = await req.app.locals.serializer.serializeError(e)
            if (e instanceof ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else {
                logger.error(e.message)
                res.status(500).json(serialized_err)
            }
        }
    })

router.put('/:org_id/categories/:cat_id', checkJwt,
    checkScopesMiddleware([scopes.CategoryEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                throw new ResourceNotFoundError(`Category ${req.params.cat_id} not found`)
            }

            checkHasOrgAccess(req['user'], req.params.org_id)

            if (!req.body.name) {
                throw new InvalidParameterValueError(`Parameter 'name' was not provided`)
            }

            cat.name = req.body.name
            await cat.save()
            cat = await cat.reload()
            req.app.locals.serializer.serializeAsync('category', cat)
                .then(serialized_data => { res.status(200).json(serialized_data) })

        } catch (e) {
            let serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            }
            else {
                res.status(500).json(serialized_err)
            }
        }
    })

router.delete('/:org_id/categories/:cat_id',
    checkJwt, checkScopesMiddleware([scopes.CategoryDelete, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                res.status(404).json({})
                return
            }

            let cat_org = await cat.getOrganization()
            checkHasOrgAccess(req['user'], cat_org.id)

            await cat.destroy()
            res.status(204).json({})

        } catch (e) {
            let serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else {
                res.status(500).json(serialized_err)
            }
        }
    })

module.exports = router