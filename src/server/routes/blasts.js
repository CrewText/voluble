import * as express from "express";

import { NotImplementedError } from '../../voluble-errors';
const router = express.Router();

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:org_id/blasts/', function (req, res, next) {
    throw new NotImplementedError()
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:org_id/blasts/:blast_id', function (req, res, next) {
    throw new NotImplementedError()
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/:org_id/blasts/', function (req, res, next) {
    throw new NotImplementedError()
})

export default router;