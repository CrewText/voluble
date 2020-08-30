import { NextFunction, Request, Response } from "express";
import * as validator from 'validator';
import * as winston from 'winston';

import { InvalidParameterValueError } from '../../voluble-errors';

const logger = winston.loggers.get(process.title).child({ module: 'CheckLimitOffsetHelper' })

function checkRequestLimit(req: Request, res: Response, next: NextFunction, min: number, max: number) {
    try {
        if (!req.query.limit) { req.query.limit = max.toString() }
        else if (!validator.default.isInt(req.query.limit as string, {
            allow_leading_zeroes: true,
            gt: min - 1,
            lt: max + 1
        })) {
            throw new InvalidParameterValueError(`Value of parameter 'limit' is invalid: ${req.params.limit}`)
        }
        next()
    }
    catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof InvalidParameterValueError) {
            return res.status(400).json(serialized_err)
        } else {
            res.status(500).json(serialized_err)
            logger.error(e)
        }
    }
}

function checkRequestOffset(req: Request, res: Response, next: NextFunction, min: number) {
    try {
        if (!req.query.offset) { req.query.offset = min.toString() }
        else if (!validator.default.isInt(req.query.offset as string, {
            allow_leading_zeroes: true,
            gt: min - 1
        })) {
            throw new InvalidParameterValueError(`Value of parameter 'offset' is invalid: ${req.params.offset}`)
        }

        next()
    } catch (e) {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof InvalidParameterValueError) {
            return res.status(400).json(serialized_err)
        } else {
            res.status(500).json(serialized_err)
            logger.error(e)
        }
    }
}

export function checkLimit(limit_min: number, limit_max: number) {
    return (req: Request, res: Response, next: NextFunction) => checkRequestLimit(req, res, next, limit_min, limit_max)
}

export function checkOffset(offset_min: number) {
    return (req: Request, res: Response, next: NextFunction) => checkRequestOffset(req, res, next, offset_min)
}