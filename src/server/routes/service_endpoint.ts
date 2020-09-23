import * as express from "express"
import { errors } from "voluble-common"
import * as winston from 'winston'

import { PluginManager } from '../../plugin-manager'
import { QueueManager } from '../../queue-manager'

const logger = winston.loggers.get(process.title).child({ module: 'ServiceEndpointRoute' })
const router = express.Router();

//router.get('/', function)

/* POST service endpoint */
router.post('/:plugin_subdir/endpoint',
    async (req, res, next) => {
        /* At this point, we know that an outside service has contacted us with an inbound message
        and that the incoming address is of the format
        https://voluble-server.com/services/plugin-subdir-here/endpoint
        so we can use the plugin subdir to determine what the plugin is and what to do next.
        */
        try {
            const request_service_dir = req.params["plugin_subdir"]
            const service = await PluginManager.getServiceByDirName(request_service_dir)

            if (!service) {
                const p = new errors.ResourceOutOfUserScopeError(`Inbound request made to service endpoint for ${request_service_dir}, which does not exist`)
                console.warn(p instanceof errors.ResourceOutOfUserScopeError)
                throw p
            }

            logger.debug(`Passing message on to ${service.directory_name}`)
            res.status(200).json({})
            QueueManager.addMessageReceivedRequest(req.body, service.id)
            return next()
        } catch (e) {
            const serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof errors.ResourceOutOfUserScopeError) {
                res.status(404).json(serialized_err)
            } else {
                return next(e)
            }
        }
    });

export default router;
