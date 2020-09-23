import * as express from 'express';
import { scopes } from "voluble-common";
import { ResourceNotFoundError } from 'voluble-common/dist/errors';

import { PluginManager } from '../../plugin-manager';
import { checkJwt } from '../security/jwt';
import { checkScopesMiddleware } from '../security/scopes';

const router = express.Router();

router.get('/',
  checkJwt,
  checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), async (req, res, next) => {
    const services = await PluginManager.getAllServices()
    res.status(200).json(req.app.locals.serializer.serialize('service', services))
    return next()
  })

router.get('/count', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  async (_req, res, next) => {
    const c = await PluginManager.getServiceCount();
    res.status(200).json({ data: { count: c } });
    return next();
  })

router.get('/:service_id', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), async (req, res, next) => {
  try {
    const service = await PluginManager.getServiceById(req.params.service_id);
    if (!service) { throw new ResourceNotFoundError(`Service ${req.params.service_id} does not exist`) }
    const serialized = req.app.locals.serializer.serialize('service', service)
    res.status(200).json(serialized);
    return next();
  } catch (e) {
    const serialized_err = req.app.locals.serializer.serializeError(e)
    if (e instanceof ResourceNotFoundError) {
      res.status(400).json(serialized_err)
    } else { next(e) }
  }
})

export default router;