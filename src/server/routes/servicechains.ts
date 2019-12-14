import * as express from "express";
import * as validator from 'validator';
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { PluginManager } from '../../plugin-manager/';
import { ServicechainManager } from '../../servicechain-manager/';
import { InvalidParameterValueError } from '../../voluble-errors';
import { checkJwt, checkJwtErr, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, setupUserOrganizationMiddleware } from "../security/scopes";
import { ResourceNotFoundError } from '../../voluble-errors'

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ServicechainsRoute' })

const router = express.Router();

router.get('/:org_id/servicechains/', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ServicechainView]), async function (req, res, next) {

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


router.post('/:org_id/servicechains/', checkJwt,
  checkJwtErr,
  checkScopesMiddleware([scopes.ServicechainAdd, scopes.VolubleAdmin]), async function (req, res, next) {

    try {
      checkHasOrgAccess(req.user, req.params.org_id)
      if (!req.body.services) { throw new InvalidParameterValueError(`Parameter 'services' must be supplied`) }
      if (!(req.body.services instanceof Array)) { throw new InvalidParameterValueError(`Parameter 'services' must be an Array`) }

      let services_supplied: any[] = req.body.services
      let services_to_add: ServicechainManager.ServicePriority[] = []

      if (!services_supplied.length) { throw new InvalidParameterValueError(`Parameter 'services' is empty`) }

      services_supplied.forEach((svc_prio_pair, idx) => {
        let s: ServicechainManager.ServicePriority = { service: svc_prio_pair.service, priority: svc_prio_pair.priority }
        services_to_add.push(s)
      });

      let sc_name = req.body.name

      // Create a new Servicechain
      let sc = await ServicechainManager.createNewServicechain(sc_name, req.params.org_id)

      // And add all of the Services to it
      for (const svc_prio_pair of services_to_add) {
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

      await sc.save()

      let resp = await ServicechainManager.getFullServicechain(sc.id)
      res.status(201).jsend.success(resp)
    } catch (e) {
      if (e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail({ name: e.name, message: e.message })
      }
      else if (e instanceof ResourceNotFoundError) {
        res.status(500).jsend.error("Internal error: Failed to create new Servicechain")
      }
      else if (e instanceof PluginManager.ServiceNotFoundError) {
        res.status(400).jsend.fail(e)
      }
      else {
        logger.error(e)
        res.status(500).jsend.error(`Internal error: ${e}`)
      }
    }
  })

router.get('/:org_id/servicechains/:sc_id', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ServicechainView]), async function (req, res, next) {

  try {
    let full_sc = await ServicechainManager.getFullServicechain(req.params.sc_id)
    res.status(200).jsend.success(full_sc)
  } catch (e) {
    if (e instanceof ResourceNotFoundError) {
      res.status(400).jsend.fail(`Servicechain with ID ${req.params.sc_id} not found`)
    }
    else {
      res.status(500).jsend.error(e)
    }
  }
})


router.put('/:org_id/servicechains/:id', checkJwt,
  checkJwtErr,
  checkScopesMiddleware([scopes.ServicechainEdit]),
  setupUserOrganizationMiddleware,
  checkHasOrgAccessMiddleware,
  async (req, res, next) => {
    // This completely overwrites the Servicechain, as opposed to using PUT on other resources,
    // which modifies them in-place.

    let sc_id: string = req.params.id

    try {
      let sc = await ServicechainManager.getServicechainById(sc_id)
      if (!sc) { throw new ResourceNotFoundError(`Servicechain with ID ${sc_id} not found`) }
      if (!Array.isArray(req.body.services)) { throw new InvalidParameterValueError(`The services parameter must be an Array of service-priority objects`) }

      req.body.services.forEach(body_pair => {
        if (!body_pair.service || !body_pair.priority) {
          throw new InvalidParameterValueError(`The fields 'service' and 'priority' must be supplied on each item`)
        } else if (typeof body_pair.priority != "number" || !validator.default.isInt(body_pair.priority.toString())) {
          throw new InvalidParameterValueError(`The value supplied for 'priority' must be an integer: ${body_pair.priority}`)
        }
      });

      let services_to_add_list: ServicechainManager.ServicePriority[] = <ServicechainManager.ServicePriority[]>req.body.services

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
      if (e instanceof ResourceNotFoundError || e instanceof PluginManager.ServiceNotFoundError || e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail(e)
      } else {
        logger.error(e)
        res.status(500).jsend.error(e)
      }
    }

  })

router.delete('/:org_id/servicechains/:sc_id', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ServicechainDelete]), function (req, res, next) {
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