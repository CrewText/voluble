import * as express from "express";
import * as validator from 'validator';
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { OrgManager } from "../../org-manager";
import { PluginManager } from '../../plugin-manager/';
import { ServicechainManager } from '../../servicechain-manager/';
import { InvalidParameterValueError, ResourceNotFoundError } from '../../voluble-errors';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, setupUserOrganizationMiddleware } from "../security/scopes";

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ServicechainsRoute' })

const router = express.Router();

router.get('/:org_id/servicechains/', checkJwt, checkScopesMiddleware([scopes.ServicechainView]), async function (req, res, next) {

  try {
    let resp: ServicechainManager.ResponseServicechain[] = []
    let scs = await ServicechainManager.getAllServicechains()
    for (const sc of scs) {
      resp.push(await ServicechainManager.getFullServicechain(sc.id))
    }

    let serialized = await req.app.locals.serializer.serializeAsync('servicechain', resp)
    res.status(200).json(serialized)
  } catch (e) {
    let serialized_err = req.app.locals.serializer.serializeError(e)
    res.status(500).json(e)
    logger.error(e)
  }
})


router.post('/:org_id/servicechains/', checkJwt,

  checkScopesMiddleware([scopes.ServicechainAdd, scopes.VolubleAdmin]), async function (req, res, next) {
    let created_sc_id: string
    try {

      checkHasOrgAccess(req['user'], req.params.org_id)
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
      let org = await OrgManager.getOrganizationById(req.params.org_id)
      if (!org) { throw new ResourceNotFoundError(`Organization resource with ID ${req.params.org_id} not found`) }
      let sc = await org.createServicechain({
        name: sc_name
      })
      created_sc_id = sc.id

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

      await (await sc.save()).reload()
      let resp = await ServicechainManager.getFullServicechain(sc.id)
      let serialized = await req.app.locals.serializer.serializeAsync('servicechain', resp)
      res.status(201).json(serialized)
    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof PluginManager.ServiceNotFoundError || e instanceof ResourceNotFoundError || e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      }
      else {
        res.status(500).json(serialized_err)
        logger.error(e)
      }
      if (created_sc_id) { ServicechainManager.deleteServicechain(created_sc_id) }
    }
  })

router.get('/:org_id/servicechains/:sc_id', checkJwt, checkScopesMiddleware([scopes.ServicechainView]), async function (req, res, next) {

  try {
    let full_sc = await ServicechainManager.getFullServicechain(req.params.sc_id)
    let serialized = req.app.locals.serializer.serializeAsync('servicechain', full_sc)
    res.status(200).json(serialized)
  } catch (e) {
    let serialized_err = req.app.locals.serializer.serializeError(e)
    if (e instanceof ResourceNotFoundError) {
      res.status(400).json(serialized_err)
    }
    else {
      res.status(500).json(serialized_err)
      logger.error(e)
    }
  }
})


router.put('/:org_id/servicechains/:id', checkJwt,

  checkScopesMiddleware([scopes.ServicechainEdit]),
  setupUserOrganizationMiddleware,
  checkHasOrgAccessMiddleware,
  async (req, res, next) => {
    // This completely overwrites the Servicechain, as opposed to using PUT on other resources,
    // which modifies them in-place.

    let sc_id: string = req.params.id

    new Promise((res, rej) => {
      if (!Array.isArray(req.body.services)) { throw new InvalidParameterValueError(`The services parameter must be an Array of service-priority objects`) }
      res()
    })
      .then(() => {
        return ServicechainManager.getServicechainById(sc_id)
      })
      .then(sc => {
        if (!sc) { throw new ResourceNotFoundError(`Servicechain with ID ${sc_id} not found`) }

        req.body.services.forEach(body_pair => {
          if (!body_pair.service || !body_pair.priority) {
            throw new InvalidParameterValueError(`The fields 'service' and 'priority' must be supplied on each item`)
          } else if (typeof body_pair.priority != "number" || !validator.default.isInt(body_pair.priority.toString())) {
            throw new InvalidParameterValueError(`The value supplied for 'priority' must be an integer: ${body_pair.priority}`)
          }
        });

        let services_to_add_list: ServicechainManager.ServicePriority[] = <ServicechainManager.ServicePriority[]>req.body.services

        // And add all of the Services to it, same logic as the POST

        return Promise.all(services_to_add_list.map((svc_prio_pair, _index, _arr) => {
          return PluginManager.getServiceById(svc_prio_pair.service)
            .then(svc => {
              if (!svc) { throw new PluginManager.ServiceNotFoundError(`Service with ID ${svc_prio_pair.service} could not be found!`) }
            })
            .then(() => {
              return sc.addService(svc_prio_pair.service, {
                through: {
                  service: svc_prio_pair.service,
                  servicechain: sc.id,
                  priority: svc_prio_pair.priority
                }
              })
            })
            .catch(e => {
              return e
            })
        }))
          .then((vals) => {
            vals.forEach(val => {
              if (val instanceof Error) { throw val }
            })

            return ServicechainManager.getFullServicechain(sc_id)
          })
          .then(full_sc => {
            return req.app.locals.serializer.serializeAsync('servicechain', full_sc)
          })
          .then(serialized => {
            res.status(200).json(serialized)
          })
      })
      .catch(e => {
        let serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof ResourceNotFoundError || e instanceof PluginManager.ServiceNotFoundError || e instanceof InvalidParameterValueError) {
          res.status(400).json(serialized_err)
        } else {
          res.status(500).json(serialized_err)
          logger.error(e)
        }
      })
  })

router.delete('/:org_id/servicechains/:sc_id', checkJwt, checkScopesMiddleware([scopes.ServicechainDelete]), function (req, res, next) {
  return ServicechainManager.deleteServicechain(req.params.sc_id)
    .then(function (row) {
      res.status(204).json({})
    })
    .catch(function (e) {
      if (e instanceof ResourceNotFoundError) { res.status(404).json({}) }
      else {
        let serialized_err = req.app.locals.serializer.serializeError(e)
        res.status(500).json(serialized_err)
        logger.error(e)
      }
    })
})

module.exports = router;