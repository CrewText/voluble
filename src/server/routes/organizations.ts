import * as express from "express"
const router = express.Router();
import * as jsend from 'jsend'
import { OrgManager } from "../../org-manager";
const errs = require('common-errors')

/**
 * Get a list of all of the organizations that the person is authorized to see.
 */
router.get('/', function (req, res, next) {
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
router.post('/', function (req, res, next) {
    let org_name = req.params.name

    OrgManager.createNewOrganization(org_name)
})

module.exports = router