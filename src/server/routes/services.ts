import * as express from 'express';
import { PluginManager } from '../../plugin-manager';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { scopes } from '../security/scopes';
const router = express.Router();
const winston = require('winston')

router.get('/', checkJwt, checkJwtErr, checkScopes([scopes.ServiceView]), function (req, res, next) {
  PluginManager.getAllServices()
    .then(function (rows) {
      res.jsend.success(rows)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

router.get('/:service_id', checkJwt, checkJwtErr, checkScopes([scopes.ServiceView]), function (req, res, next) {
  return PluginManager.getServiceById(req.params.service_id)
    .then(function (service) {
      if (service) { res.jsend.success(service) }
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
    })
})

module.exports = router;