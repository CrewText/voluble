const express = require('express');
const router = express.Router();
const Promise = require('bluebird')
const winston = require('winston')
const pluginManager = require('../bin/plugin-manager/plugin-manager')


/* Note: this is boilerplate and has NOT been implemented yet */
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

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  res.render('service_info', {contact_id: id})
})

module.exports = router;