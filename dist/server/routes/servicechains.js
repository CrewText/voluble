"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const Promise = require("bluebird");
const router = express.Router();
const winston = require('winston');
const utils = require("../../utilities");
const _1 = require("../../servicechain-manager/");
const _2 = require("../../plugin-manager/");
const errs = require('common-errors');
router.get('/', function (req, res, next) {
    _1.ServicechainManager.getAllServicechains()
        .then(function (rows) {
        res.jsend.success(rows);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.post('/', function (req, res, next) {
    let services_list = req.body.services;
    winston.debug("Request for new SC: " + req.body.name + ", with services:");
    winston.debug(services_list);
    _1.ServicechainManager.createNewServicechain(req.body.name, services_list)
        .then(function (sc) {
        res.jsend.success(sc);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.get('/:sc_id', function (req, res, next) {
    utils.verifyNumberIsInteger(req.params.sc_id)
        .then(function (sc_id) {
        return _1.ServicechainManager.getServicechainById(sc_id);
    })
        .then(function (sc) {
        if (!sc) {
            throw new errs.NotFoundError(`/servicechains/id: No servicechain found`);
        }
        return _1.ServicechainManager.getServicesInServicechain(sc.id)
            .then(function (svcs_in_sc) {
            return Promise.map(svcs_in_sc, function (svc_in_sc) {
                return _2.PluginManager.getServiceById(svc_in_sc.service_id);
            })
                .then(function (full_svcs) {
                return Object.assign(sc.dataValues, { services: full_svcs });
            });
        });
    })
        .then(function (sc_with_svcs) {
        res.status(200).json(sc_with_svcs);
    })
        .catch(errs.TypeError, function () {
        res.jsend.fail({ 'id': 'Supplied ID is not an integer' });
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
router.put('/:id', function (req, res, next) {
    res.render('servicechains_update', { group_id: req.params.id, data: req.params });
});
router.delete('/:sc_id', function (req, res, next) {
    utils.verifyNumberIsInteger(req.params.sc_id)
        .then(function (sc_id) {
        return _1.ServicechainManager.deleteServicechain(sc_id);
    })
        .then(function (row) {
        res.jsend.success(row);
    })
        .catch(function (error) {
        res.jsend.error(error.message);
    });
});
module.exports = router;
