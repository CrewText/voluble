import * as express from "express";
import { ContactManager } from '../../contact-manager';
import * as utils from '../../utilities';
import { checkJwt, checkScopes, checkJwtErr } from '../security/jwt';
import { scopes } from '../security/scopes'
const router = express.Router();
const errs = require('common-errors')
const winston = require('winston')

/**
 * Handles the route `GET /contacts`.
 * Lists the first 100 of the contacts available to the user, with a given offset
 */
router.get('/', function (req, res, next) {

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = (req.query.offset == undefined ? 0 : req.query.offset)

  return utils.verifyNumberIsInteger(offset)
    .then(function (offset: number) {
      return ContactManager.getHundredContacts(offset)
    })
    .then(function (rows: any) {
      res.jsend.success(rows)
      //res.status(200).json(rows)
    })
    .catch(function (err: any) {
      res.jsend.error(err.message)
      //res.status(500).json(err.message)
    })
})

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:contact_id', checkJwt, checkJwtErr, checkScopes([scopes.ContactView]), checkJwt, function (req, res, next) {
  ContactManager.checkContactWithIDExists(req.params.contact_id)
    .then(function (id) {
      return ContactManager.getContactWithId(id)
    })
    .then(function (user) {
      if (user) {
        res.jsend.success(user)
      }
    })
    .catch(errs.NotFoundError, function (error) {
      res.jsend.fail({ "id": "No user exists with this ID." })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
    })

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 */
router.post('/', function (req, res, next) {

  return ContactManager.createContact(req.body.first_name, req.body.surname, req.body.email_address, req.body.phone_number, req.body.default_servicechain)
    .then(function (newContact) {
      res.jsend.success(newContact)
      //res.status(200).json(newContact)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).end()
    })
})

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:contact_id', function (req, res, next) {
  return ContactManager.checkContactWithIDExists(req.params.contact_id)
    .then(function (id) {
      return ContactManager.updateContactDetailsWithId(id, req.body)
    })
    .then(function (updateDetails) {
      res.jsend.success(updateDetails[1][0])
      //      res.status(200).end()
    })
    .catch(errs.NotFoundError, function (err) {
      res.jsend.fail({ "id": "No user exists with this ID." })
    })
    .catch(function (error: any) {
      //console.log(err)
      res.jsend.error(error.message)
      //res.status(500).send(err)
    })
})

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence. This is why there is no validation that the contact exists first.
 */
router.delete('/:contact_id', function (req, res, next) {

  utils.verifyNumberIsInteger(req.params.contact_id)
  return ContactManager.deleteContactFromDB(req.params.contact_id)
    .then(function (resp) {
      res.jsend.success(resp)
      //res.status(200).json(resp)
    })
    .catch(errs.TypeError, function (error) {
      res.jsend.fail({ 'id': "ID supplied is not an integer." })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //console.log(error.message)
      //res.status(500).end()
    })
})

router.get('/:contact_id/messages', function (req, res, next) {
  //TODO: #11 - Make this work!
})

module.exports = router;