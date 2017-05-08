var express = require('express');
var router = express.Router();

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/', function(req,res,next){
  res.render('messages_list')
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  res.render('message_info', {contact_id: id})
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function(req, res, next){
  res.render('message_send', {data: req.params}) // Is this right?
})

module.exports = router;