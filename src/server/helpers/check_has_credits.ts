import { Request, Response, NextFunction } from "express";
import { OrgManager } from "../../org-manager";
import { NotEnoughCreditsError } from "../../voluble-errors";
import { PlanTypes } from "voluble-common";

export function checkHasCredits(credits_required: number) {
    return function (req: Request, res: Response, next: NextFunction) {
        let sub_id = req['user'].sub
        if (sub_id == `${process.env.AUTH0_TEST_CLIENT_ID}@clients`) {
            return next() // test client, let it do everything
        } else {
            OrgManager.getOrganizationById(req['user'].organization)
                .then(org => {
                    if (org.plan == PlanTypes.PAY_IN_ADVANCE && org.credits >= credits_required) {
                        return next()
                    } else {
                        throw new NotEnoughCreditsError('The Organization does not have enough credits for this operation')
                    }
                })
        }
    }
}