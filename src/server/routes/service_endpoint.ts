import * as express from "express"
import { PluginManager } from '../../plugin-manager'
import { QueueManager } from '../../queue-manager'
const winston = require('winston')
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

    winston.info("SVC END: incoming req to " + request_service_dir)
    PluginManager.getServiceByDirName(request_service_dir)
        .then(function (service) {
            if (!service) {
                winston.error(`SVC END: Inbound request made to service endpoint for ${request_service_dir}, which does not exist`)
                res.jsend.fail(`Plugin ${request_service_dir} does not exist`)
                return
            }
            winston.debug(`Passing message on to ${service.directory_name}`)

            QueueManager.addMessageReceivedRequest(req.body, service.id)
            res.jsend.success(request_service_dir)
        })
});

module.exports = router;
