import * as express from "express";
import * as winston from 'winston';

import { UserManager } from "../../user-manager";
import { ResourceNotFoundError, ResourceOutOfUserScopeError } from '../../voluble-errors';
import { checkJwt } from '../security/jwt';

const logger = winston.loggers.get(process.mainModule.filename).child({ module: 'UsersRoute' })
const router = express.Router();

/**
 * 
 */
router.get('/:user_id', checkJwt,
    (req, res, next) => {
        new Promise((res, rej) => {
            if (req.params.user_id != req['user'].sub) {
                throw new ResourceOutOfUserScopeError(`Users accessing this endpoint may only request information about themself.`)
            }

            res(UserManager.getUserById(req['user'].sub))
        })
            .then(user => {
                if (!user) { throw new ResourceNotFoundError(`User with ID ${req['user'].sub} not found`) }
                return req.app.locals.serializer.serializeAsync('user', user)
            })
            .then(serialized => res.status(200).json(serialized))
            .catch(e => {
                const serialized_err = req.app.locals.serializer.serializeError(e)
                if (e instanceof ResourceOutOfUserScopeError) { res.status(403).json(serialized_err) }
                else if (e instanceof ResourceNotFoundError) { res.status(404).json(serialized_err) }
                else {
                    res.status(500).json(serialized_err)
                    logger.error(e)
                }
            })

    })

export default router