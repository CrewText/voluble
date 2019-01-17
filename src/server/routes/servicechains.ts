import * as Promise from "bluebird";
import * as express from "express";
import { ServicesInSCInstance } from "../../models/servicesInServicechain";
import { PluginManager } from '../../plugin-manager/';
import { ServicechainManager } from '../../servicechain-manager/';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { scopes } from '../security/scopes';
import service from "../../models/service";
const router = express.Router();
const winston = require('winston')

const errs = require('common-errors')

router.get('/', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainView]), function (req, res, next) {
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


router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainAdd, scopes.VolubleAdmin]), function (req, res, next) {
  let services_list: ServicechainManager.ServicechainPriority[] = <ServicechainManager.ServicechainPriority[]>req.body.services
  let sc_name = req.body.name
  return ServicechainManager.createNewServicechain(sc_name)
    .then(function (sc) {
      return Promise.each(services_list, function (service_prio_pair) {
        return PluginManager.getServiceById(service_prio_pair.service_id)
          .then(function (svc) {
            if (!svc) { return Promise.reject(new errs.NotFoundError(`Service with ID ${service_prio_pair.service_id} not found`)) }
            return sc.addService(svc, {
              through: {
                priority: service_prio_pair.priority,
                servicechainId: sc.id,
                serviceId: svc.id
              }
            })
          })
      })
        .then((l) => {
          return sc
        })
    })
    .then(function (sc) {
      res.status(201).jsend.success(sc)
    })
    .catch(errs.NotFoundError, function (err) {
      res.status(400).jsend.fail(err)
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).jsend.error(err)
    })

})

router.get('/:sc_id', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainView]), function (req, res, next) {
  // First, get the servicechain itself
  return ServicechainManager.getServicechainById(req.params.sc_id)
    .then(function (sc) {
      // Then, find out which services are in the chain
      if (!sc) {
        throw new errs.NotFoundError(`/servicechains/id: No servicechain found`)
      }
      return ServicechainManager.getServicesInServicechain(sc.id)
        .then(function (svcs_in_sc) {
          // We only have the IDs of the services - get their names too!
          return Promise.map(svcs_in_sc, function (svc_in_sc: ServicesInSCInstance) {
            return PluginManager.getServiceById(svc_in_sc.serviceId)
          })
            .then(function (full_svcs) {
              // And now we have all of the info for the services, add them into
              // the SC object so we have one big object to return.
              //@ts-ignore
              return Object.assign(sc.dataValues, { services: full_svcs })
            })

        })
    })
    .then(function (sc_with_svcs) {
      res.status(200).jsend.success(sc_with_svcs)
    })
    .catch(errs.TypeError, function () {
      res.jsend.fail({ 'id': 'Supplied ID is not an integer' })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})


router.put('/:id', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainEdit]), function (req, res, next) {
  res.render('servicechains_update', { group_id: req.params.id, data: req.params }) //TODO: Make PUT/servicechains/ID work
})

router.delete('/:sc_id', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainDelete]), function (req, res, next) {
  return ServicechainManager.deleteServicechain(req.params.sc_id)
    .then(function (row) {
      res.jsend.success(row)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

module.exports = router;