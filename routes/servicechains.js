var express = require('express');
var router = express.Router();
const winston = require('winston')
const Promise = require('bluebird')

const utils = require('../utilities')
const scManager = require('../bin/servicechain-manager/servicechain-manager')
const pluginManager = require('../bin/plugin-manager/plugin-manager')

router.get('/', function(req,res,next){
  scManager.getAllServicechains()
  .then(function(rows){
    res.status(200).json(rows)
  })
  .catch(function(err){
    res.status(500).json(err)
    winston.error(err)
  })
})

router.get('/:sc_id', function(req, res, next){
  utils.verifyNumberIsInteger(req.params.sc_id)
  .then(function(sc_id){
    // First, get the servicechain itself
    return scManager.getServicechainById(sc_id)
  })
  .then(function(sc){
    // Then, find out which services are in the chain
    return scManager.getServicesInServicechain(sc.id)
    .then(function(svcs_in_sc){
      // We only have the IDs of the services - get their names too!
      return Promise.map(svcs_in_sc, function(svc_in_sc){
        return pluginManager.getPluginInfoById(svc_in_sc.service_id)
      })
      .then(function(full_svcs){
        // And now we have all of the info for the services, add them into
        // the SC object so we have one big object to return.
        return Object.assign(sc.dataValues, {services: full_svcs})
      })
      
    })
  })
  .then(function(sc_with_svcs){
    res.status(200).json(sc_with_svcs)
  })
  .catch(function (err){
    res.status(500).json(err)
    winston.error(err)
  })
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function(req, res, next){
  res.render('servicechains_create', {data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/{id}', function(req, res, next){
  res.render('servicechains_update', {group_id: id, data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.delete('/{id}', function(req, res, next){
  res.render('servicechains_delete', {group_id: id})
})

module.exports = router;