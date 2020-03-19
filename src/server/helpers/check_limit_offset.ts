import { NextFunction, Request, Response } from "express";
import * as validator from 'validator';
import { InvalidParameterValueError } from '../../voluble-errors';
import * as winston from 'winston';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'CheckLimitOffsetHelper' })

function checkRequestLimit(req: Request, res: Response, next: NextFunction, min: number, max: number) {
    try {
        if (!req.query.limit) { req.query.limit = max }
        else if (!validator.default.isInt(req.query.limit, {
            allow_leading_zeroes: true,
            gt: min - 1,
            lt: max + 1
        })) {
            throw new InvalidParameterValueError(`Value of parameter 'limit' is invalid: ${req.params.limit}`)
        }
        next()
    }
    catch (e) {
        if (e instanceof InvalidParameterValueError) {
            return res.status(400).jsend.fail(e.message)
        } else {
            logger.error(e)
            return res.status(500).jsend.fail(e.message)
        }
    }
    // next()
}

function checkRequestOffset(req: Request, res: Response, next: NextFunction, min: number) {
    try {
        if (!req.query.offset) { req.query.offset = min }
        else if (!validator.default.isInt(req.query.offset, {
            allow_leading_zeroes: true,
            gt: min - 1
        })) {
            throw new InvalidParameterValueError(`Value of parameter 'offset' is invalid: ${req.params.offset}`)
        }

        next()
    } catch (e) {
        if (e instanceof InvalidParameterValueError) {
            return res.status(400).jsend.fail(e.message)
        } else {
            logger.error(e)
            return res.status(500).jsend.fail(e.message)
        }
    }
}

export function checkLimit(limit_min: number, limit_max: number) {
    return function (req: Request, res: Response, next: NextFunction) {
        try {
            checkRequestLimit(req, res, next, limit_min, limit_max)
        } catch (e) { throw e }
    }
}

export function checkOffset(offset_min: number) {
    return function (req: Request, res: Response, next: NextFunction) {
        try {
            checkRequestOffset(req, res, next, offset_min)
        } catch (e) { throw e }
    }
}