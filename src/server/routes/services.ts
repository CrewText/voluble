import * as express from 'express';
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { PluginManager } from '../../plugin-manager';
import { checkJwt, checkJwtErr, checkScopesMiddleware } from '../security/jwt';

let logger = winston.loggers.get('voluble-log').child({ module: 'ServicesRoute' })

const router = express.Router();

router.get('/', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ServiceView]), function (req, res, next) {
  PluginManager.getAllServices()
    .then(function (rows) {
      res.jsend.success(rows)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

router.get('/:service_id', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ServiceView]), function (req, res, next) {
  return PluginManager.getServiceById(req.params.service_id)
    .then(function (service) {
      if (service) { res.jsend.success(service) }
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
    })
})

module.exports = router;