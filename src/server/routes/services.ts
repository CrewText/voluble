import * as express from 'express'
const router = express.Router();
const winston = require('winston')
import { PluginManager } from '../../plugin-manager'

router.get('/', function (req, res, next) {
  PluginManager.getAllServices()
    .then(function (rows) {
      res.jsend.success(rows)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
})

router.get('/:service_id', function (req, res, next) {
  return PluginManager.getServiceById(req.params.service_id)
    .then(function (service) {
      if (service) { res.jsend.success(service) }
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
    })
})

module.exports = router;