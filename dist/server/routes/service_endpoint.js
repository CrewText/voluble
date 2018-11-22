"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const plugin_manager_1 = require("../../plugin-manager");
const queue_manager_1 = require("../../queue-manager");
const winston = require('winston');
var router = express.Router();
router.post('/:plugin_subdir/endpoint', function (req, res, next) {
    let request_service_dir = req.params["plugin_subdir"];
    winston.info("SVC END: incoming req to " + request_service_dir);
    plugin_manager_1.PluginManager.getServiceByDirName(request_service_dir)
        .then(function (service) {
        if (!service) {
            winston.error(`SVC END: Inbound request made to service endpoint for ${request_service_dir}, which does not exist`);
            res.jsend.fail(`Plugin ${request_service_dir} does not exist`);
            return;
        }
        winston.debug(`Passing message on to ${service.directory_name}`);
        queue_manager_1.QueueManager.addMessageReceivedRequest(req.body, service.id);
        res.jsend.success(request_service_dir);
    });
});
module.exports = router;
