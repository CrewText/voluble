import * as express from "express";
import { scopes } from "voluble-common";
import { PluginManager } from '../../plugin-manager/';
import { ServicechainManager } from '../../servicechain-manager/';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';

import winston = require("winston");
import { checkUserOrganization, checkHasOrgAccess } from "../security/scopes";
const router = express.Router();

const errs = require('common-errors')

router.get('/', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainView]), async function (req, res, next) {

  try {
    let resp: ServicechainManager.ResponseServicechain[] = []
    let scs = await ServicechainManager.getAllServicechains()
    for (const sc of scs) {
      resp.push(await ServicechainManager.getFullServicechain(sc.id))
    }

    res.status(200).jsend.success(resp)
  } catch (e) {
    res.status(500).jsend.error(e)
  }
})


router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainAdd, scopes.VolubleAdmin]), async function (req, res, next) {
  let services_to_add_list: ServicechainManager.ServicechainPriority[] = <ServicechainManager.ServicechainPriority[]>req.body.services
  let sc_name = req.body.name

  // Create a new Servicechain
  let sc = await ServicechainManager.createNewServicechain(sc_name)

  // And add all of the Services to it
  try {
    for (const svc_prio_pair of services_to_add_list) {
      const svc = await PluginManager.getServiceById(svc_prio_pair.service);
      if (!svc) {
        throw new PluginManager.ServiceNotFoundError(`Service with ID ${svc_prio_pair.service} could not be found!`);
      }
      await sc.addService(svc_prio_pair.service, {
        through: {
          service: svc_prio_pair.service,
          servicechain: sc.id,
          priority: svc_prio_pair.priority
        }
      })
    }

    await sc.sequelize.sync()

    let resp = await ServicechainManager.getFullServicechain(sc.id)
    res.status(201).jsend.success(resp)
  } catch (e) {
    if (e instanceof ServicechainManager.ServicechainNotFoundError) {
      res.status(500).jsend.error("Internal error: Failed to create new Servicechain")
    }
    else if (e instanceof PluginManager.ServiceNotFoundError) {
      res.status(400).jsend.fail(e)
    }
    else {
      res.status(500).jsend.error(`Internal error: ${e}`)
    }
  }
})

router.get('/:sc_id', checkJwt, checkJwtErr, checkScopes([scopes.ServicechainView]), async function (req, res, next) {

  try {
    let full_sc = await ServicechainManager.getFullServicechain(req.params.sc_id)
    res.status(200).jsend.success(full_sc)
  } catch (e) {
    if (e instanceof ServicechainManager.ServicechainNotFoundError) {
      res.status(400).jsend.fail(`Servicechain with ID ${req.params.sc_id} not found`)
    }
    else {
      res.status(500).jsend.error(e)
    }
  }
})


router.put('/:id', checkJwt,
  checkJwtErr,
  checkScopes([scopes.ServicechainEdit]),
  checkUserOrganization,
  checkHasOrgAccess,
  async (req, res, next) => {
    // This completely overwrites the Servicechain, as opposed to using PUT on other resources,
    // which modifies them in-place.

    let sc_id: string = req.params.id

    try {
      let sc = await ServicechainManager.getServicechainById(sc_id)
      if (!sc) { throw new ServicechainManager.ServicechainNotFoundError(`Servicechain with ID ${sc_id} not found`) }

      let services_to_add_list: ServicechainManager.ServicechainPriority[] = <ServicechainManager.ServicechainPriority[]>req.body.services

      // And add all of the Services to it, same logic as the POST

      for (const svc_prio_pair of services_to_add_list) {
        const svc = await PluginManager.getServiceById(svc_prio_pair.service);
        if (!svc) {
          throw new PluginManager.ServiceNotFoundError(`Service with ID ${svc_prio_pair.service} could not be found!`);
        }
        await sc.addService(svc_prio_pair.service, {
          through: {
            service: svc_prio_pair.service,
            servicechain: sc.id,
            priority: svc_prio_pair.priority
          }
        })
      }

      let full_sc = await ServicechainManager.getFullServicechain(sc_id)
      res.status(200).jsend.success(full_sc)
    }

    catch (e) {
      if (e instanceof ServicechainManager.ServicechainNotFoundError || e instanceof PluginManager.ServiceNotFoundError) {
        res.status(400).jsend.fail(e)
      } else {
        res.status(500).jsend.error(e)
      }
    }

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