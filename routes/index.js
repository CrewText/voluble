var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/groups', function(req,res,next){
  res.render('groups_list')
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/groups/{id}', function(req, res, next){
  res.render('groups_list_contacts', {id: id})
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/groups', function(req, res, next){
  res.render('groups_create', {data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/groups/{id}', function(req, res, next){
  res.render('groups_update', {group_id: id, data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.delete('/groups/{id}', function(req, res, next){
  res.render('groups_delete', {group_id: id})
})

module.exports = router;
