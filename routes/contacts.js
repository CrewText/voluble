var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');

var client = new dbClient({
  host: 'localhost',
  user: 'root',
  password: ''
});


router.get('/', function (req, res, next) {

  let prep = client.prepare("SELECT * FROM `voluble`.`contacts` ORDER BY id ASC")
  let q = client.query(prep())
  let contacts = []

  q.on('result', function (result) {
    result.on('data', function (row) {
      row.url = req.protocol + '://' + req.get('host') + "/contacts/" + row.id
      contacts.push(row)
    })
  }).on('end', function () {
    res.json(contacts).status(200)
  })
})

router.get('/:contact_id', function (req, res, next) {
  let contact_id = parseInt(req.params.contact_id)

  // Check that the supplied contact ID is a valid int
  if (!contact_id){
    let error = {error: "Supplied contact ID is not an integer!"}
    res.status(200).json(error)
    return
  }
  
  // Make the DB request for contact with ID `contact_id`
  let query = client.prepare();
  client.query("SELECT * FROM voluble.contacts WHERE id = ?", [contact_id], { useArray: true }, function (err, rows) {
    if (err) { throw err };
    
    // Check that the contact actually exists
    if (!rows.length){
      let error = {error: "Contact with this ID does not exist."}
      res.status(200).json(error)
    } else {
      // And if it does, return it!
      res.json(rows)
    }
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