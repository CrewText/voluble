var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/', function(req,res,next){
  //res.render('contacts_list')
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function(req, res, next){
  //res.render('contact_info', {contact_id: id})
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function(req, res, next){
  //res.render('contacts_create', {data: req.params}) // Is this right?
  
  // Add a random contact
  let client = new dbClient({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  let prep = client.prepare("INSERT INTO `voluble`.`contacts` (`first_name`, `surname`, `email_address`, `default_servicechain`) VALUES (?, ?, ?, '1')")
  client.query(prep([req.body.first_name, req.body.surname, req.body.email_address]), function(err, rows){
    if (err)
      throw err;

    console.dir(rows);
  })

  res.send(`Inserted ${req.body.first_name} ${req.body.surname}!`);

})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/{id}', function(req, res, next){
  res.render('contacts_update', {group_id: id, data: req.params}) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.delete('/{id}', function(req, res, next){
  res.render('contacts_delete', {group_id: id})
})

module.exports = router;