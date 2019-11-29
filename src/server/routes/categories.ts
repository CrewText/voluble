import * as express from "express";
import { scopes } from "voluble-common";
import { CategoryManager } from "../../contact-manager";
import { checkJwt, checkJwtErr, checkScopesMiddleware } from "../security/jwt";
import { setupUserOrganizationMiddleware, checkHasOrgAccess, ResourceOutOfUserScopeError } from "../security/scopes";
import { OrgManager } from "../../org-manager";
import { ResourceNotFoundError } from "../../voluble-errors"
const winston = require('winston')

const router = express.Router();

router.get('/:org_id/categories', checkJwt,
    checkJwtErr, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {

        try {
            checkHasOrgAccess(req.user, req.params.org_id)
            let org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) {
                throw new ResourceNotFoundError(`Organization not found: ${req.params.org_id}`)
            }

            let cats = await org.getCategories()
            res.status(200).jsend.success(cats)
        }
        catch (e) {
            if (e instanceof ResourceOutOfUserScopeError) {
                res.status(401).jsend.fail(e)
            } else {
                winston.error(e.message)
                res.status(500).jsend.error(e.message)
            }

        }
    })

router.post('/:org_id/categories', checkJwt,
    checkJwtErr, checkScopesMiddleware([scopes.ContactAdd, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        if (!req.body.name) {
            res.status(400).jsend.fail(`Parameter 'name' was not provided`)
            return
        }
        try {
            checkHasOrgAccess(req.user, req.params.org_id)
            let org = await OrgManager.getOrganizationById(req.params.org_id)
            if (!org) { throw new ResourceNotFoundError(`Organization not found: ${req.params.org_id}`) }
            let new_cat = await org.createCategory({
                name: req.body.name
            })

            res.status(201).jsend.success(new_cat)
        } catch (e) {
            if (e instanceof ResourceOutOfUserScopeError) {
                res.status(401).jsend.fail(e)
            } else {
                winston.error(e.message)
                res.status(500).jsend.error(e)
            }
        }
    })

router.get('/:org_id/categories/:cat_id',
    checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                throw new ResourceNotFoundError(`Category ${req.params.cat_id} not found`)
            }
            let cat_org = await cat.getOrganization()
            checkHasOrgAccess(req.user, cat_org.id)

            res.status(200).jsend.success(cat)
        } catch (e) {
            if (e instanceof ResourceNotFoundError) {
                res.status(404).jsend.fail(e.message)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).jsend.fail("User does not have the necessary scopes to access this resource")
            } else {
                winston.error(e.message)
                res.status(500).jsend.error(e)
            }
        }
    })

router.put('/:org_id/categories/:cat_id', checkJwt, checkJwtErr,
    checkScopesMiddleware([scopes.ContactEdit, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                throw new ResourceNotFoundError(`Category ${req.params.cat_id} not found`)
            }

            checkHasOrgAccess(req.user, req.params.org_id)

            if (!req.body.name) {
                return res.status(400).jsend.fail(`Parameter 'name' was not provided`)
            }

            cat.name = req.body.name
            await cat.save()
            cat = await cat.reload()
            res.status(200).jsend.success(cat)

        } catch (e) {
            if (e instanceof ResourceNotFoundError) {
                res.status(404).jsend.fail(e.message)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).jsend.fail("User does not have the necessary scopes to access this resource")
            } else {
                res.status(500).jsend.error(e)
            }
        }
    })

router.delete('/:org_id/categories/:cat_id',
    checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ContactDelete, scopes.VolubleAdmin]),
    setupUserOrganizationMiddleware, async (req, res, next) => {
        try {
            let cat = await CategoryManager.getCategoryById(req.params.cat_id)
            if (!cat) {
                res.status(404).jsend.success(true)
                return
            }

            let cat_org = await cat.getOrganization()
            checkHasOrgAccess(req.user, cat_org.id)

            await cat.destroy()
            res.status(200).jsend.success(true)

        } catch (e) {
            if (e instanceof ResourceNotFoundError) {
                res.status(404).jsend.fail(e.message)
            } else if (e instanceof ResourceOutOfUserScopeError) {
                res.status(403).jsend.fail("User does not have the necessary scopes to access this resource")
            } else {
                res.status(500).jsend.error(e)
            }
        }
    })

module.exports = router