import * as express from 'express'
const router = express.Router();
import * as Promise from 'bluebird'
const winston = require('winston')
import {PluginManager} from '../../plugin-manager'
import * as utils from '../../utilities'

router.get('/', function(req,res,next){
  PluginManager.getAllServices()
  .then(function(rows){
    res.status(200).json(rows)
  })
  .catch(function(err){
    res.status(500).json(err)
    winston.error(err)
  })
})

router.get('/:service_id', function(req, res, next){
  utils.verifyNumberIsInteger(req.params.service_id)
  .then(function(service_id){
    return PluginManager.getServiceById(service_id)
  })
  .then(function(plugin){
    res.status(200).json(plugin)
  })
  .catch(function(err){
    res.status(500).json(err)
    winston.error(err)
  })
})

module.exports = router;