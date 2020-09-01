import * as express from 'express';
import { scopes } from "voluble-common";

import { PluginManager } from '../../plugin-manager';
import { checkJwt } from '../security/jwt';
import { checkScopesMiddleware } from '../security/scopes';

const router = express.Router();

router.get('/', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), (req, res, next) => {
  PluginManager.getAllServices()
    .then(function (rows) {
      return req.app.locals.serializer.serializeAsync('service', rows)
    })
    .then(serialized_data => {
      res.status(200).json(serialized_data)
      return next()
    })
})

router.get('/count', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  async (_req, res, next) => {
    const c = await PluginManager.getServiceCount();
    res.status(200).json({ data: { count: c } });
    return next();
  })

router.get('/:service_id', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), async (req, res, next) => {
  const service = await PluginManager.getServiceById(req.params.service_id);
  if (service) {
    return req.app.locals.serializer.serializeAsync('service', service);
  }
  const serialized_svc = undefined;
  res.status(200).json(serialized_svc);
  return next();
})

export default router;