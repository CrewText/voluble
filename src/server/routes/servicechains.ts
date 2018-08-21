import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')

import * as utils from '../../utilities'
import {ServicechainManager} from '../../servicechain-manager/'
import {PluginManager} from '../../plugin-manager/'
import { ServicesInSCInstance } from "../../models/servicesInServicechain";
const errs = require('common-errors')

router.get('/', function (req, res, next) {
  ServicechainManager.getAllServicechains()
    .then(function (rows) {
      res.jsend.success(rows)
      //res.status(200).json(rows)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})


router.post('/', function (req, res, next) {
  let services_list = req.body.services
  winston.debug("Request for new SC: " + req.body.name + ", with services:")
  winston.debug(services_list)

  ServicechainManager.createNewServicechain(req.body.name, services_list)
    .then(function (sc) {
      res.jsend.success(sc)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
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
    .catch(errs.TypeError, function(){
      res.jsend.fail({'id': 'Supplied ID is not an integer'})
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})


router.put('/:id', function (req, res, next) {
  res.render('servicechains_update', { group_id: req.params.id, data: req.params }) //TODO: Make PUT/servicechains/ID work
})

router.delete('/:sc_id', function (req, res, next) {
  utils.verifyNumberIsInteger(req.params.sc_id)
    .then(function (sc_id) {
      return ServicechainManager.deleteServicechain(sc_id)
    })
    .then(function (row) {
      res.jsend.success(row)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

module.exports = router;