var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');

var client = new dbClient({
  host: 'localhost',
  user: 'root',
  password: ''
});

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/', function(req,res,next){
  //res.render('contacts_list')
  let prep = client.prepare("SELECT first_name, surname, email_address FROM `voluble`.`contacts` ORDER BY id ASC")
  client.query(prep(), null, {useArray: true}, function(err, rows){
    if (err){throw err}
    res.json(rows)
    res.send()
  })
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:id', function(req, res, next){
  //res.render('contact_info', {contact_id: id})
  console.log("Got param: " + req.params.id);

  let query = client.prepare();
  client.query("SELECT * FROM voluble.contacts WHERE id = ?", [parseInt(req.params.id)], {useArray: true}, function (err, rows){
    if (err){throw err};
    res.json(rows)
  })

})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function(req, res, next){
  //res.render('contacts_create', {data: req.params}) // Is this right?
  
  // Add a random contact

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