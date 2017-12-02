var express = require('express');
var router = express.Router();
var Q = require('q');
const promise = require('bluebird')
var utils = require('../utilities.js')
const db = require('../models')

/**
 * Adds a new Contact to the database with specified details. All Contacts must have these details as a minimum.
 * @param {string} first_name The first name of the new Contact.
 * @param {string} surname The surname of the new Contact.
 * @param {string} email The email address of the new Contact.
 * @param {integer} default_servicechain The ID of the servicechain that the contact should be used by default to send a message to this Contact.
 */
function createContact(first_name, surname, email, default_servicechain) {

  return db.sequelize.model('Contact').create({
    first_name: first_name,
    surname: surname,
    email_address: email,
    default_servicechain: default_servicechain
  })
}


/**
 * Removes a contact with ID `id` from the database
 * @param {integer} id ID of contact to remove
 * @returns {Bluebird promise}
 */

function deleteContactFromDB(id) {
  return db.sequelize.model('Contact').destroy({
    where: {
      id: id
    }
  })
}

/**
 * Queries the database to make sure confirm that the contact with id `id` exists
 * @param {integer} id Contact ID number
 * @returns {Q.promise} with value `id` if contact exists
 */
function checkContactWithIDExists(id) {
  return new Promise(function (resolve, reject) {
    return db.sequelize.model('Contact').count({ where: { id: id } })
      .then(function (count) {
        if (count == "0") {
          reject("No contact with ID " + id + fount)
        } else {
          resolve(id)
        }
      })
  })
}

/**
 * Queries the database to retrieve the info for contact with ID `id`
 * @param {integer} id Contact ID number
 * @returns {Promise} with JSON data containing user info
 */
function getContactWithId(id) {

  return db.sequelize.model('Contact').findOne({
    where: {
      id: id
    }
  })

}

/**
 * Updates the details of a single Contact. Internally calls {@link updateSingleContactDetailWithId} for each detail change.
 * @param {integer} id ID of the Contact whose details will be updated
 * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g `{first_name: 'Adam', surname: 'Smith'}`
 */
function updateContactDetailsWithId(id, updatedDetails) {
  return db.sequelize.model('Contact').update(updatedDetails,
    {
      where: { id: id }
    })
}

/**
 * Handles the route `GET /contacts`.
 * Lists all of the contacts available to the user.
 */
router.get('/', function (req, res, next) {

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)


  return utils.verifyNumberIsInteger(offset)
    .then(function (offset) {
      return db.sequelize.model('Contact').findAll({
        offset: offset, limit: 100
      })
    })
    .then(function (rows) {
      res.status(200).json(rows)
    })
    .catch(function (err) {
      res.status(500).json(err.message)
    })
})

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:contact_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (id) {
      return checkContactWithIDExists(id)
    })
    .then(function (id) {
      return getContactWithId(id)
    }).then(function (user) {
      res.status(200).json(user)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 */
router.post('/', function (req, res, next) {

  Q.fcall(function () {
    return createContact(req.body.first_name, req.body.surname, req.body.email_address, req.body.default_servicechain)
  })
    .then(function (newContactID) {
      res.status(200).send("New contact: ID " + newContactID)
    })
    .catch(function (error) {
      console.log(error)
      res.status(500).end()
    })
    .done()

})

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:contact_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (id) {
      return Q.fcall(function () {
        return checkContactWithIDExists(id)
      })
    })
    .then(function (id) {
      return Q.fcall(function () {
        return updateContactDetailsWithId(id, req.body)
      })
    })
    .then(function () {
      res.status(200).end()
    })
    .catch(function () {
      console.log(err)
      res.status(500).send(err)
    })
})

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence.
 */
router.delete('/:contact_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (contact_id) {
      return Q.fcall(function () {
        return deleteContactFromDB(contact_id)
      })
    })
    .catch(function (error) {
      console.log(error.message)
      res.status(500).end()
    })
    .done()
})

module.exports = router;