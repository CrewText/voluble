import * as express from "express"
import * as winston from 'winston'
import { PluginManager } from '../../plugin-manager'
import { QueueManager } from '../../queue-manager'
import { PluginDoesNotExistError } from "../../voluble-errors"

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ServiceEndpointRoute' })
var router = express.Router();

//router.get('/', function)

/* POST service endpoint */
router.post('/:plugin_subdir/endpoint', function (req, res, next) {
    /* At this point, we know that an outside service has contacted us with an inbound message
    and that the incoming address is of the format
    https://voluble-server.com/services/plugin-subdir-here/endpoint
    so we can use the plugin subdir to determine what the plugin is and what to do next.
    */

    let request_service_dir = req.params["plugin_subdir"]

    logger.debug("incoming req to " + request_service_dir)
    PluginManager.getServiceByDirName(request_service_dir)
        .then(function (service) {
            if (!service) {
                throw new PluginDoesNotExistError(`Inbound request made to service endpoint for ${request_service_dir}, which does not exist`)
            }
            logger.debug(`Passing message on to ${service.directory_name}`)

            return QueueManager.addMessageReceivedRequest(req.body, service.id)

        }).then(() => {
            res.status(200).json({})
        })
        .catch((e) => {
            let serialized_err = req.app.locals.serializer.serializeError(e)
            if (e instanceof PluginDoesNotExistError) {
                res.status(404).json(serialized_err)
            } else {
                res.status(500).json(serialized_err)
            }
        })
});

module.exports = router;
