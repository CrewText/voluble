import * as express from 'express';
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { PluginManager } from '../../plugin-manager';
import { checkJwt } from '../security/jwt';
import { checkScopesMiddleware } from '../security/scopes';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ServicesRoute' })
const router = express.Router();

router.get('/', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), function (req, res, next) {
  PluginManager.getAllServices()
    .then(function (rows) {
      return req.app.locals.serializer.serializeAsync('service', rows)
    })
    .then(serialized_data => {
      res.status(200).json(serialized_data)
    })
    .catch(function (e: any) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      res.status(500).json(serialized_err)
      logger.error(e)
    })
})

router.get('/count', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  (req, res, next) => {
    return PluginManager.getServiceCount()
      .then(c => {
        return res.status(200).json({ data: { count: c } })
      })
  })

router.get('/:service_id', checkJwt, checkScopesMiddleware([scopes.ServiceView, scopes.VolubleAdmin, scopes.OrganizationOwner]), function (req, res, next) {
  return PluginManager.getServiceById(req.params.service_id)
    .then(function (service) {
      if (service) {
        return req.app.locals.serializer.serializeAsync('service', service)
      }
    })
    .then(serialized_svc => {
      res.status(200).json(serialized_svc)
    })
    .catch(function (e: any) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      res.status(500).json(serialized_err)
      logger.error(e)
    })
})

module.exports = router;