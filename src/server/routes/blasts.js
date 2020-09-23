import * as express from "express";
import { errors } from "voluble-common";
const router = express.Router();

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:org_id/blasts/', (__req, __res, __next) => {
    throw new errors.NotImplementedError("Retrieve blasts - not implemented")
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:org_id/blasts/:blast_id', (_req, _res, _next) => {
    throw new errors.NotImplementedError("retrieve blast by id - not implemented")
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/:org_id/blasts/', (_req, _res, _next) => {
    throw new errors.NotImplementedError("create blast - not implemented")
})

export default router;