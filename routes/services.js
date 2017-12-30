const express = require('express');
const router = express.Router();
const Promise = require('bluebird')
const winston = require('winston')
const pluginManager = require('../bin/plugin-manager/plugin-manager')
const utils = require('../utilities')

router.get('/', function(req,res,next){
  pluginManager.getAllPlugins()
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
    return pluginManager.getPluginInfoById(service_id)
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