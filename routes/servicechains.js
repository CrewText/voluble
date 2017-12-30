var express = require('express');
var router = express.Router();
const winston = require('winston')

const scManager = require('../bin/servicechain-manager/servicechain-manager')

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

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  res.render('servicechains_info', {contact_id: id})
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