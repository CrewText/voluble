import { NextFunction, Request, Response } from "express";
import { errors, PlanTypes } from "voluble-common";

import { OrgManager } from "../../org-manager";
import { ExpressMiddleware } from "./express_req_res_next";

export function checkHasCredits(credits_required: number): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
        const sub_id = req['user'].sub
        if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
            return next() // test client, let it do everything
        } else {
            try {
                const org = await OrgManager.getOrganizationById(req['user'].organization)

                if (org.plan == PlanTypes.PAYG && org.credits < credits_required) {
                    throw new errors.NotEnoughCreditsError('The Organization does not have enough credits for this operation')
                } else {
                    return next()
                }
            } catch (e) {
                const serialized_err = req.app.locals.serializer.serializeError(e)
                if (e instanceof errors.NotEnoughCreditsError) {
                    res.status(402).json(serialized_err)
                } else { next(e) }
            }
        }
    }
}