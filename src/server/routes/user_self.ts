import * as express from "express";
import { errors } from "voluble-common";

import { UserManager } from "../../user-manager";
import { checkJwt } from '../security/jwt';
import { Auth0User } from "../security/scopes";

//const logger = winston.loggers.get(process.title).child({ module: 'UsersRoute' })
const router = express.Router();

router.get('/:user_id', checkJwt,
    async (req, res, next) => {
        try {
            if (req.params.user_id != (req['user'] as Auth0User).sub) {
                throw new errors.ResourceOutOfUserScopeError(`Users accessing this endpoint may only request information about themself.`)
            }

            const user = await UserManager.getUserById(req['user'].sub)
            if (!user) { throw new errors.ResourceNotFoundError(`User with ID ${req['user'].sub} not found`) }
            res.status(200).json(req.app.locals.serializer.serialize('user', user))
            return next()
        }

        catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) { res.status(403).json(serialized_err) }
            else if (e instanceof errors.ResourceNotFoundError) { res.status(404).json(serialized_err) }
            else { next(e) }
        }
    })

export default router