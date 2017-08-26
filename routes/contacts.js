var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');

var client = new dbClient({
  host: 'localhost',
  user: 'root',
  password: ''
});


router.get('/', function (req, res, next) {

  let prep = client.prepare("SELECT first_name, surname, email_address FROM `voluble`.`contacts` ORDER BY id ASC")
  let q = client.query(prep())
  let contacts = []

  q.on('result', function (result) {
    result.on('data', function (row) {
      contacts.push(row)
    })
  }).on('end', function () {
    res.json(contacts).status(200)
  })
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/:id', function (req, res, next) {
  /* TODO: add validity checking - make sure the contact exists! */
  /* TODO: add validity checking - make sure the param is a number */

  let contact_id = null
  try {
    contact_id = parseInt(req.params.id)
  } catch (e) {
    res.status(500).send("Supplied contact ID is not an integer!")
    return
  }

  let query = client.prepare();
  client.query("SELECT * FROM voluble.contacts WHERE id = ?", [parseInt(req.params.id)], { useArray: true }, function (err, rows) {
    if (err) { throw err };
    res.json(rows)
  })

})



/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function (req, res, next) {
  //res.render('contacts_create', {data: req.params}) // Is this right?

  // Add a random contact

  let prep = client.prepare("INSERT INTO `voluble`.`contacts` (`first_name`, `surname`, `email_address`, `default_servicechain`) VALUES (?, ?, ?, '1')")
  client.query(prep([req.body.first_name, req.body.surname, req.body.email_address]), function (err, rows) {
    if (err)
      throw err;

    console.dir(rows);
  })

  res.send(`Inserted ${req.body.first_name} ${req.body.surname}!`);

})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/{id}', function (req, res, next) {
  res.render('contacts_update', { group_id: id, data: req.params }) // Is this right?
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.delete('/{id}', function (req, res, next) {
  res.render('contacts_delete', { group_id: id })
})

module.exports = router;