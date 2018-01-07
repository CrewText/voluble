var express = require('express');
var router = express.Router();

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/', function(req,res,next){
  res.render('groups_list')
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  res.render('groups_list_contacts', {id: id})
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function(req, res, next){
  res.render('groups_create', {data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/{id}', function(req, res, next){
  res.render('groups_update', {group_id: id, data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.delete('/{id}', function(req, res, next){
  res.render('groups_delete', {group_id: id})
})

module.exports = router;