const express = require('express');
const router = express.Router();
const promise = require('bluebird')
const utils = require('../utilities.js')
const contactManager = require('../bin/contact-manager/contact-manager')

/**
 * Handles the route `GET /contacts`.
 * Lists all of the contacts available to the user.
 */
router.get('/', function (req, res, next) {

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)


  return utils.verifyNumberIsInteger(offset)
    .then(function (offset) {
      return contactManager.getHundredContacts(offset)
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
      return contactManager.checkContactWithIDExists(id)
    })
    .then(function (id) {
      return contactManager.getContactWithId(id)
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

  return contactManager.createContact(req.body.first_name, req.body.surname, req.body.email_address, req.body.default_servicechain)
    .then(function (newContactID) {
      res.status(200).send("New contact: ID " + newContactID)
    })
    .catch(function (error) {
      console.log(error)
      res.status(500).end()
    })
})

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:contact_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.contact_id)
    .then(function (id) {
      return contactManager.checkContactWithIDExists(id)
      })
    .then(function (id) {
        return contactManager.updateContactDetailsWithId(id, req.body)
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
        return contactManager.deleteContactFromDB(contact_id)
    })
    .then(function(resp){
      res.status(200).json(resp)
    })
    .catch(function (error) {
      console.log(error.message)
      res.status(500).end()
    })
})

module.exports = router;