import * as express from "express";
import validator from "validator";
import { errors, scopes } from "voluble-common";

import { OrgManager } from "../../org-manager";
import { ResponseServicechain, ServicechainManager, ServicePriority } from '../../servicechain-manager/';
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, checkHasOrgAccessParamMiddleware, checkScopesMiddleware, setupUserOrganizationMiddleware } from "../security/scopes";


//const logger = winston.loggers.get(process.title).child({ module: 'ServicechainsRoute' })

const router = express.Router();

router.get('/:org_id/servicechains/', checkJwt,
  checkScopesMiddleware([scopes.ServicechainView, scopes.VolubleAdmin]),
  checkHasOrgAccessParamMiddleware('org_id'),
  setupUserOrganizationMiddleware,
  async (req, res, next) => {

    const resp: ResponseServicechain[] = []
    const scs = await ServicechainManager.getAllServicechains()
    for (const sc of scs) {
      resp.push(await ServicechainManager.getFullServicechain(sc.id))
    }

    const serialized = req.app.locals.serializer.serialize('servicechain', resp)
    res.status(200).json(serialized)
    return next()
  })

router.get('/:org_id/servicechains/count', checkJwt, checkScopesMiddleware([scopes.ServicechainView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  checkHasOrgAccessParamMiddleware('org_id'),
  setupUserOrganizationMiddleware,
  async (req, res, next) => {

    try {
      const org = await OrgManager.getOrganizationById(req.params.org_id)
      res.status(200).json({ data: { count: await org.countServicechains() } })
      return next()
    }

    catch (e) {
      const serialized_err = res.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      }
      else if (e instanceof errors.ResourceNotFoundError) {
        res.status(400).json(serialized_err)
      }
      else { next(e) }
    }
  })

router.post('/:org_id/servicechains/', checkJwt,
  checkScopesMiddleware([scopes.ServicechainAdd, scopes.VolubleAdmin]),
  async (req, res, next) => {
    let created_sc_id: string
    try {
      checkHasOrgAccess(req['user'], req.params.org_id)
      if (!req.body.services) { throw new errors.InvalidParameterValueError(`Parameter 'services' must be supplied`) }
      if (!(req.body.services instanceof Array)) { throw new errors.InvalidParameterValueError(`Parameter 'services' must be an Array`) }

      const services_supplied: ServicePriority[] = req.body.services
      const services_to_add: ServicePriority[] = []

      if (!services_supplied.length) { throw new errors.InvalidParameterValueError(`Parameter 'services' is empty`) }

      services_supplied.forEach((svc_prio_pair, _idx) => {
        const s: ServicePriority = { service: svc_prio_pair.service, priority: svc_prio_pair.priority }
        services_to_add.push(s)
      });

      const sc_name = req.body.name

      // Create a new Servicechain
      const org = await OrgManager.getOrganizationById(req.params.org_id)
      if (!org) { throw new errors.ResourceNotFoundError(`Organization resource with ID ${req.params.org_id} not found`) }

      const sc = await org.createServicechain({
        name: sc_name
      })

      created_sc_id = sc.id

      await ServicechainManager.addServicesToServicechain(services_to_add, created_sc_id)

      const resp = await ServicechainManager.getFullServicechain(created_sc_id)
      const serialized = req.app.locals.serializer.serialize('servicechain', resp)
      res.status(201).json(serialized)
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (created_sc_id) { ServicechainManager.deleteServicechain(created_sc_id) }
      if (e instanceof errors.ResourceNotFoundError || e instanceof errors.InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else { next(e) }
    }
  })

router.get('/:org_id/servicechains/:sc_id', checkJwt, checkScopesMiddleware([scopes.ServicechainView]), async (req, res, next) => {

  try {
    const full_sc = await ServicechainManager.getFullServicechain(req.params.sc_id)
    const serialized = req.app.locals.serializer.serialize('servicechain', full_sc)
    res.status(200).json(serialized)
    return next()
  } catch (e) {
    const serialized_err = req.app.locals.serializer.serializeError(e)
    if (e instanceof errors.ResourceNotFoundError) {
      res.status(400).json(serialized_err)
    }
    else { next(e) }
  }
})


router.put('/:org_id/servicechains/:id', checkJwt,
  checkScopesMiddleware([scopes.ServicechainEdit]),
  setupUserOrganizationMiddleware,
  checkHasOrgAccessMiddleware,
  async (req, res, next) => {
    // This completely overwrites the Servicechain, as opposed to using PUT on other resources,
    // which modifies them in-place.

    try {
      const sc_id: string = req.params.id
      if (!Array.isArray(req.body.services)) { throw new errors.InvalidParameterValueError(`The services parameter must be an Array of service-priority objects`) }

      const sc = await ServicechainManager.getServicechainById(sc_id)
      if (!sc) { throw new errors.ResourceNotFoundError(`Servicechain with ID ${sc_id} not found`) }


      const services_supplied: ServicePriority[] = req.body.services
      const services_to_add: ServicePriority[] = services_supplied.map(svc_prio_pair => {
        if (!svc_prio_pair.service || !svc_prio_pair.priority) {
          throw new errors.InvalidParameterValueError(`The fields 'service' and 'priority' must be supplied on each item`)
        } else if (typeof svc_prio_pair.priority != "number" || !validator.isInt(svc_prio_pair.priority.toString())) {
          throw new errors.InvalidParameterValueError(`The value supplied for 'priority' must be an integer: ${svc_prio_pair.priority}`)
        }
        return { service: svc_prio_pair.service, priority: svc_prio_pair.priority }
      })

      await sc.setServices([])
      await ServicechainManager.addServicesToServicechain(services_to_add, sc.id)

      const full_sc = await ServicechainManager.getFullServicechain(sc_id)
      res.status(200).json(req.app.locals.serializer.serialize('servicechain', full_sc))
      return next()
    }
    catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)

      if (e instanceof errors.ResourceNotFoundError || e instanceof errors.InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else { next(e) }
    }
  })

router.delete('/:org_id/servicechains/:sc_id', checkJwt, checkScopesMiddleware([scopes.ServicechainDelete]),
  checkHasOrgAccessMiddleware,
  async (req, res, next) => {
    try {
      await ServicechainManager.deleteServicechain(req.params.sc_id)

      res.status(204).json({})
      return next()
    }
    catch (e) {
      if (e instanceof errors.ResourceNotFoundError) { res.status(404).json({}) }
      else if (e instanceof errors.ResourceOutOfUserScopeError) {
        const serialized_err = req.app.locals.serializer.serializeError(e)
        res.status(403).json(serialized_err)
      }
      else { next(e) }
    }
  })

export default router;