var express = require('express');
var router = express.Router();

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/', function(req,res,next){
  res.render('services_list')
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  res.render('service_info', {contact_id: id})
})

module.exports = router;