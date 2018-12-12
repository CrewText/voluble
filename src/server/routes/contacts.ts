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
router.get('/', checkJwt, checkJwtErr, checkScopes([scopes.ContactView, scopes.VolubleAdmin]), function (req, res, next) {

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = req.query.offset ? req.query.offset : 0
  console.log(offset)
  return utils.verifyNumberIsInteger(offset)
    .then(function (offset: number) {
      console.log(offset)
      return ContactManager.getHundredContacts(offset)
    })
    .then(function (rows: any) {
      res.status(200).jsend.success(rows)
      //res.status(200).json(rows)
    })
    .catch(function (err: any) {
      res.status(500).jsend.error(err.message)
      //res.status(500).json(err.message)
    })
})

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:contact_id', checkJwt, checkJwtErr, checkScopes([scopes.ContactView, scopes.VolubleAdmin]), checkJwt, function (req, res, next) {
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
      res.status(404).jsend.fail({ "id": "No user exists with this ID." })
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
    })

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 */
router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.ContactAdd, scopes.VolubleAdmin]), function (req, res, next) {
  //TODO: Normalize contact phone number to e164 format

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
router.put('/:contact_id', checkJwt, checkJwtErr, checkScopes([scopes.ContactEdit, scopes.VolubleAdmin]), function (req, res, next) {
  return ContactManager.getContactWithId(req.params.contact_id)
    .then(function (contact) {
      if (!contact) { throw new errs.NotFoundError("No contact exists with this ID") }
      ["first_name", "surname", "phone_number", "email_address"].forEach(trait => {
        //TODO: Validate phone no and email
        if (req.body[trait]) {
          contact[trait] = req.body[trait]
        }
      });
      return contact.save()
    })
    .then(function (contact) {
      if (req.body.OrganizationId) {
        //TODO: Validate this!
        return contact.setOrganization(req.body.OrganizationId)
          .then(function () { return contact })
      } else { return contact }
    })
    .then(function (contact) {
      if (req.body.default_servicechain) {
        //TODO: Validate this!
        return contact.setServicechain(req.body.default_servicechain)
          .then(function () { return contact })
      } else { return contact }
    })
    .then(function (contact) {
      res.status(200).jsend.success(contact)
    })
    .catch(errs.NotFoundError, function (err) {
      res.status(404).jsend.fail({ "id": "No user exists with this ID." })
    })
    .catch(function (error: any) {
      winston.error(error)
      res.status(500).jsend.error(error.message)
    })
})

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence. This is why there is no validation that the contact exists first.
 */
router.delete('/:contact_id', checkJwt, checkJwtErr, checkScopes([scopes.ContactDelete, scopes.VolubleAdmin]), function (req, res, next) {

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

router.get('/:contact_id/messages', checkJwt, checkJwtErr, checkScopes([scopes.MessageRead, scopes.VolubleAdmin]), function (req, res, next) {
  //TODO: #11 - Make this work!
})

module.exports = router;