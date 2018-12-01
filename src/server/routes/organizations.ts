import * as express from "express";
import { OrgManager } from "../../org-manager";
import { checkJwt, checkJwtErr } from '../security/jwt';
const router = express.Router();
const errs = require('common-errors')

/**
 * Get a list of all of the organizations that the person is authorized to see.
 */
router.get('/', checkJwt, checkJwtErr, function (req, res, next) {
    OrgManager.getAllOrganizations()
        .then(function (organizations) {
            res.jsend.success(organizations)
        })
    // Failure?
})

/**
 * Create a new organization. This needs parameters:
 * @param name
 */
router.post('/', checkJwt, checkJwtErr, function (req, res, next) {
    let org_name = req.params.name

    OrgManager.createNewOrganization(org_name)
})

module.exports = router