import * as express from "express";
import { errors, scopes } from "voluble-common";

import { CategoryManager } from "../../contact-manager";
import { Category } from "../../models/category";
import { OrgManager } from "../../org-manager";
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkJwt } from "../security/jwt";
import { checkHasOrgAccess, checkScopesMiddleware, setupUserOrganizationMiddleware } from "../security/scopes";

//const logger = winston.loggers.get(process.title).child({ module: 'CategoriesRoute' })
const router = express.Router();

router.get('/:org_id/categories',
    checkJwt,
    checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    async (req, res, next) => {

        try {
            checkHasOrgAccess(req['user'], req.params.org_id)
            const org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) { throw new errors.ResourceNotFoundError(`Organization not found: ${req.params.org_id}`) }
            const cats = await org.getCategories()
            res.status(200).json(res.app.locals.serializer.serialize('category', cats))
            return next()
        } catch (e) {
            const serialized_err = res.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof errors.ResourceNotFoundError) { res.status(400).json(serialized_err) }
            else { throw e }

        }
    })

router.get('/:org_id/categories/count',
    checkJwt,
    checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
    async (req, res, next) => {
        try {
            checkHasOrgAccess(req['user'], req.params.org_id)

            const org = await OrgManager.getOrganizationById(req.params.org_id)
            const cat_count = await org.countCategories()
            res.status(200).json({ data: { count: cat_count } })
            return next()
        } catch (e) {
            const serialized_err = res.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            }
            else if (e instanceof errors.ResourceNotFoundError) {
                res.status(400).json(serialized_err)
            }
            else { throw e }
        }
    })

router.post('/:org_id/categories',
    checkJwt,
    checkScopesMiddleware([scopes.CategoryAdd, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            checkHasOrgAccess(req['user'], req.params.org_id)
            checkExtendsModel(req.body, Category)

            const org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) { throw new errors.ResourceNotFoundError(`Organization not found: ${req.params.org_id}`) }
            const new_cat = await org.createCategory({ name: req.body.name })

            res.status(201).json(req.app.locals.serializer.serialize('category', new_cat))
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof errors.InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            }
            else { throw e }
        }
    })

router.get('/:org_id/categories/:cat_id',
    checkJwt,
    checkScopesMiddleware([scopes.CategoryView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    async (req, res, next) => {
        try {
            checkHasOrgAccess(req['user'], req.params.org_id)

            const cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) { throw new errors.ResourceNotFoundError(`Category ${req.params.cat_id} not found`) }
            res.status(200).json(req.app.locals.serializer.serialize('category', cat))
            return next()
        } catch (e) {
            const serialized_err = await req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else { throw e }
        }
    })

router.put('/:org_id/categories/:cat_id', checkJwt,
    checkScopesMiddleware([scopes.CategoryEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            const cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) { throw new errors.ResourceNotFoundError(`Category ${req.params.cat_id} not found`) }

            checkHasOrgAccess(req['user'], req.params.org_id)

            if (!req.body.name) { throw new errors.InvalidParameterValueError(`Parameter 'name' was not provided`) }
            cat.name = req.body.name

            await cat.save()
            await cat.reload()
            res.status(200).json(req.app.locals.serializer.serialize('category', cat));
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else if (e instanceof errors.InvalidParameterValueError) {
                res.status(400).json(serialized_err)
            }
            else { throw e }
        }
    })

router.delete('/:org_id/categories/:cat_id',
    checkJwt,
    checkScopesMiddleware([scopes.CategoryDelete, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware,
    async (req, res, next) => {
        try {
            const cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) { throw new errors.ResourceNotFoundError(`Category ${req.params.cat_id} not found`) }

            const cat_org = await cat.getOrganization()
            checkHasOrgAccess(req['user'], cat_org.id)

            await cat.destroy()
            res.status(204).json({})
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceNotFoundError) {
                res.status(404).json(serialized_err)
            } else if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(403).json(serialized_err)
            } else { throw e }
        }
    })

export default router