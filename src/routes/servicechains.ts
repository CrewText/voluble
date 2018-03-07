import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')

import * as utils from '../utilities'
import {ServicechainManager} from '../bin/servicechain-manager/servicechain-manager'
import {PluginManager} from '../bin/plugin-manager/plugin-manager'
import { ServicesInSCInstance } from "../models/servicesInServicechain";

router.get('/', function (req, res, next) {
  ServicechainManager.getAllServicechains()
    .then(function (rows) {
      res.status(200).json(rows)
    })
    .catch(function (err) {
      res.status(500).json(err)
      winston.error(err)
    })
})


router.post('/', function (req, res, next) {
  let services_list = req.body.services
  winston.debug("Request for new SC: " + req.body.name + ", with services:")
  winston.debug(services_list)

  ServicechainManager.createNewServicechain(req.body.name, services_list)
    .then(function (sc) {
      res.status(200).json(sc)
    })
    .catch(function (err) {
      res.status(500).json(err)
      winston.error(err)
    })
    
})

router.get('/:sc_id', function (req, res, next) {
  utils.verifyNumberIsInteger(req.params.sc_id)
    .then(function (sc_id) {
      // First, get the servicechain itself
      return ServicechainManager.getServicechainById(sc_id)
    })
    .then(function (sc) {
      // Then, find out which services are in the chain
      return ServicechainManager.getServicesInServicechain(sc.id)
        .then(function (svcs_in_sc) {
          // We only have the IDs of the services - get their names too!
          return Promise.map(svcs_in_sc, function (svc_in_sc:ServicesInSCInstance) {
            return PluginManager.getServiceById(svc_in_sc.service_id)
          })
            .then(function (full_svcs) {
              // And now we have all of the info for the services, add them into
              // the SC object so we have one big object to return.
              return Object.assign(sc.dataValues, { services: full_svcs })
            })

        })
    })
    .then(function (sc_with_svcs) {
      res.status(200).json(sc_with_svcs)
    })
    .catch(function (err) {
      res.status(500).json(err)
      winston.error(err)
    })
})


/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/{id}', function (req, res, next) {
  res.render('servicechains_update', { group_id: id, data: req.params }) //TODO: Make PUT/servicechains/ID work
})

router.delete('/:sc_id', function (req, res, next) {
  utils.verifyNumberIsInteger(req.params.sc_id)
    .then(function (sc_id) {
      return ServicechainManager.deleteServicechain(sc_id)
    })
    .then(function (row) {
      res.status(200).json(row)
    })
    .catch(function (err) {
      res.status(500).json(err)
      winston.error(err)
    })
})

module.exports = router;