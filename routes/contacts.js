var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');
var Q = require('q');
var utils = require('../utilities.js')
const db = require('../models')

/**
 * Adds a new Contact to the database with specified details. All Contacts must have these details as a minimum.
 * @param {string} first_name The first name of the new Contact.
 * @param {string} surname The surname of the new Contact.
 * @param {string} email The email address of the new Contact.
 * @param {integer} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
 */
function addContactToDB(first_name, surname, email, default_servicechain) {

  return db.sequelize.model('Contact').create({
    first_name: first_name,
    surname: surname,
    email_address: email,
    default_servicechain: default_servicechain
  })

  /* *** NON-SEQUELIZED ***
  let deferred = Q.defer()

  let prep = db.prepare("INSERT INTO `voluble`.`contacts` (`first_name`, `surname`, `email_address`, `default_servicechain`) VALUES (?, ?, ?, ?)")
  db.query(prep([first_name, surname, email, default_servicechain]), function (err, rows) {
    if (err) {
      deferred.reject(err)
    }

    deferred.resolve(db.lastInsertId())
  })

  return deferred.promise
  */
}


/**
 * Removes a contact with ID `id` from the database
 * @param {integer} id ID of contact to remove
 * @returns {Q.promise}
 */

function deleteContactFromDB(db, id) {
  let deferred = Q.defer()
  db.query("DELETE FROM voluble.contacts WHERE id = ?", [id], true, function (err, rows) {
    if (err) { deferred.reject(err) }
    else {
      console.log("Successfully deleted contact " + id)
      deferred.resolve()
    }
  })

  return deferred.promise
}

/**
 * Queries the database to make sure confirm that the contact with id `id` exists
 * @param {integer} id Contact ID number
 * @returns {Q.promise} with value `id` if contact exists
 */
function checkContactWithIDExists(db, id) {
  let deferred = Q.defer()
  db.query("SELECT id FROM voluble.contacts WHERE id = ?", [id], { useArray: true }, function (err, rows) {
    if (err) { deferred.reject(err) }
    else if (!rows.length) {
      deferred.reject(new Error("Contact with this ID does not exist."))
    }
    else deferred.resolve(id)
  })
  return deferred.promise
}

/**
 * Queries the database to retrieve the info for contact with ID `id`
 * @param {integer} id Contact ID number
 * @returns {Q.promise} with JSON data containing user info
 */
function getContactWithId(db, id) {
  let deferred = Q.defer()
  db.query("SELECT * FROM voluble.contacts WHERE id = ?", [id], { useArray: true }, function (err, rows) {
    if (err) { deferred.reject(err) }
    else {
      deferred.resolve(rows[0])
    }
  })

  return deferred.promise
}

/**
 * Does UPDATE DB operation to update a Contact's detail. Usually called by {@link updateContactDetailsWithId}.
 * @param {integer} id ID of contact to update
 * @param {string} field_name Name of the parameter to update, e.g. `first_name`
 * @param {string} new_value Value to insert at `field_name`
 */
function updateSingleContactDetailWithId(db, id, field_name, new_value) {
  let deferred = Q.defer()

  db.query("UPDATE voluble.contacts SET " + field_name + " = ? WHERE id = ?", [new_value, id], function (err, rows) {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve()
    }

  })

  return deferred.promise
}

/**
 * Updates the details of a single Contact. Internally calls {@link updateSingleContactDetailWithId} for each detail change.
 * @param {integer} id ID of the Contact whose details will be updated
 * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g `{first_name: 'Adam', surname: 'Smith'}`
 */
function updateContactDetailsWithId(db, id, updatedDetails) {
  /* Expect `updatedDetail` could be like:
  {
    first_name: "Derek",
    email_address: "steve@apple.com"
  }
  */
  promises = []

  for (detail in updatedDetails) {
    promises.push(updateSingleContactDetailWithId(db, id, detail, updatedDetails[detail]))
  }
  return Q.all(promises)
}

/**
 * Handles the route `GET /contacts`.
 * Lists all of the contacts available to the user.
 */
router.get('/', function (req, res, next) {

  let client = new dbClient(req.app.locals.db_credentials);
  let prep = client.prepare("SELECT * FROM `voluble`.`contacts` ORDER BY id ASC")
  let query = client.query(prep())
  let contacts = []

  query.on('result', function (result) {
    result.on('data', function (row) {
      row.url = req.protocol + '://' + req.get('host') + "/contacts/" + row.id
      contacts.push(row)
    })
  }).on('end', function () {
    res.json(contacts).status(200)
  })

  client.end()

})

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:contact_id', function (req, res, next) {

  let client = new dbClient(req.app.locals.db_credentials);

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (id) {
      return checkContactWithIDExists(client, id)
    })
    .then(function (id) {
      return getContactWithId(client, id)
    }).then(function (user) {
      res.status(200).json(user)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })
    .finally(function () {
      client.end()
    })
    .done()

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 */
router.post('/', function (req, res, next) {

  let client = new dbClient(req.app.locals.db_credentials);

  Q.fcall(function () {
    console.log("sname: " + req.body.surname)
    return addContactToDB(req.body.first_name, req.body.surname, req.body.email_address, req.body.default_servicechain)
  })
    .then(function (newContactID) {
      res.status(200).send("New contact: ID " + newContactID)
    })
    .catch(function (error) {
      console.log(error)
      res.status(500).end()
    })
    .finally(function () {
      client.end()
    })
    .done()

})

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:contact_id', function (req, res, next) {

  let client = new dbClient(req.app.locals.db_credentials);

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (id) {
      return checkContactWithIDExists(client, id)
    })
    .then(function (id) {
      return updateContactDetailsWithId(client, id, req.body)
    })
    .then(function () {
      res.status(200).end()
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
    .finally(function () {
      client.end()
    })
    .done()

})

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence.
 */
router.delete('/:contact_id', function (req, res, next) {

  let client = new dbClient(req.app.locals.db_credentials);

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (contact_id) {
      return deleteContactFromDB(client, contact_id)
    })
    .then(function () {
      res.send("Successfully deleted contact " + req.params.contact_id)
    })
    .catch(function (error) {
      console.log(error.message)
      res.status(500).end()
    })
    .finally(function () {
      client.end()
    })
    .done()
})

module.exports = router;