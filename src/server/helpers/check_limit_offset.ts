import { NextFunction, Request, Response } from "express";
import * as validator from 'validator';
import { errors } from "voluble-common";

import { ExpressMiddleware } from "./express_req_res_next";

//const logger = winston.loggers.get(process.title).child({ module: 'CheckLimitOffsetHelper' })

function checkRequestLimit(req: Request, res: Response, next: NextFunction, min: number, max: number): NextFunction | void | Response<unknown> {
    try {
        if (!req.query.limit) { req.query.limit = max.toString() }
        else if (!validator.default.isInt(req.query.limit as string, {
            allow_leading_zeroes: true,
            gt: min - 1,
            lt: max + 1
        })) {
            throw new errors.InvalidParameterValueError(`Value of parameter 'limit' is invalid: ${req.params.limit}`)
        }
        return next()
    }
    catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof errors.InvalidParameterValueError) {
            return res.status(400).json(serialized_err)
        } else { throw e }
    }
}

function checkRequestOffset(req: Request, res: Response, next: NextFunction, min: number): NextFunction | void | Response<unknown> {
    try {
        if (!req.query.offset) { req.query.offset = min.toString() }
        else if (!validator.default.isInt(req.query.offset as string, {
            allow_leading_zeroes: true,
            gt: min - 1
        })) {
            throw new errors.InvalidParameterValueError(`Value of parameter 'offset' is invalid: ${req.params.offset}`)
        }

        return next()
    } catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof errors.InvalidParameterValueError) {
            return res.status(400).json(serialized_err)
        } else { throw e }
    }
}

export function checkLimit(limit_min: number, limit_max: number): ExpressMiddleware {
    return (req: Request, res: Response, next: NextFunction) => checkRequestLimit(req, res, next, limit_min, limit_max)
}

export function checkOffset(offset_min: number): ExpressMiddleware {
    return (req: Request, res: Response, next: NextFunction) => checkRequestOffset(req, res, next, offset_min)
}