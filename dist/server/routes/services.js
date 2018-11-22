"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const winston = require('winston');
const plugin_manager_1 = require("../../plugin-manager");
router.get('/', function (req, res, next) {
    plugin_manager_1.PluginManager.getAllServices()
        .then(function (rows) {
        res.jsend.success(rows);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.get('/:service_id', function (req, res, next) {
    return plugin_manager_1.PluginManager.getServiceById(req.params.service_id)
        .then(function (service) {
        if (service) {
            res.jsend.success(service);
        }
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
module.exports = router;
