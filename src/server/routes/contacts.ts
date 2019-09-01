import * as Promise from 'bluebird';
import * as express from "express";
import * as libphonenumber from 'google-libphonenumber';
import * as validator from 'validator';
import { scopes } from "voluble-common";
import { ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager';
import * as utils from '../../utilities';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { checkUserOrganization } from '../security/scopes';
import user from '../../models/user';
import { ContactInstance } from '../../models';

const router = express.Router();
const errs = require('common-errors')
const winston = require('winston')

/**
 * Handles the route `GET /contacts`.
 * Lists the first 100 of the contacts available to the user, with a given offset
 */
router.get('/', checkJwt,
  checkJwtErr,
  checkScopes([scopes.ContactView, scopes.VolubleAdmin]),
  checkUserOrganization,
  function (req, res, next) {

    // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
    let offset = req.query.offset ? req.query.offset : 0
    return utils.verifyNumberIsInteger(offset)
      .then(function (offset: number) {
        return ContactManager.getHundredContacts(offset, req.user.organization)
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
      res.status(500).jsend.error(error.message)
    })

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 * 
 * 
 */
router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.ContactAdd, scopes.VolubleAdmin]), checkUserOrganization, function (req, res, next) {

  Promise.map(req.body, (proposed_contact_details) => {
    let contact_fname = proposed_contact_details["first_name"]
    let contact_sname = proposed_contact_details["surname"]
    let contact_email = proposed_contact_details["email_address"].toLowerCase()
    let contact_phone = proposed_contact_details["phone_number"]
    let contact_sc = proposed_contact_details["default_servicechain"]
    let contact_org = req.user.organization

    if (!(typeof contact_email == "string") || !validator.isEmail(contact_email, { require_tld: true })) {
      //console.log(validator.isEmail(contact_email, { require_tld: true }))
      throw new errs.ValidationError("Supplied parameter 'email_address' is not the correct format: " + contact_email)
    }
    const phone_util = libphonenumber.PhoneNumberUtil.getInstance()
    try {
      phone_util.isValidNumber(phone_util.parse(contact_phone))
    } catch {
      throw new errs.ValidationError("Supplied parameter 'phone_number' is not the correct format: " + contact_phone)
    }
    return ContactManager.createContact(contact_fname, contact_sname, contact_email, contact_phone, contact_sc, contact_org)
  })

    .then(function (newContacts) {
      res.status(201).jsend.success(newContacts)
    })
    .catch(errs.ValidationError, function (err) {
      res.status(400).jsend.fail(err)
    })
    .catch(function (error: any) {
      res.status(500).jsend.error(error)
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
      res.status(404).jsend.fail({ "id": "No contact exists with this ID." })
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
router.delete('/:contact_id',
  checkJwt,
  checkJwtErr,
  checkUserOrganization,
  checkScopes([scopes.ContactDelete, scopes.VolubleAdmin]), function (req, res, next) {

    let contact_id = req.params.contact_id
    if (!validator.isUUID(contact_id)) {
      throw new errs.ValidationError("Supplied parameter contact_id is not a UUID: " + contact_id)
    }
    return ContactManager.getContactWithId(contact_id)
      .then(function (contact) {
        if (!contact) {
          return false // Because idempotence
        }

        contact.getOrganization()
          .then((org) => {
            if (org.id != req.user.organization) {
              throw new errs.NotPermittedError("User does not have access to this resource")
            }
          })

        return contact.destroy()
          .then(function () { return true })
      })
      .then(function (resp) {
        res.status(resp ? 200 : 410).jsend.success(true) // Send a 410 if the contact no longer exists
      })
      .catch(errs.ValidationError, function (error) {
        res.status(400).jsend.fail({ 'id': "ID supplied is not an UUID." })
      })
      .catch(errs.NotPermittedError, (err) => {
        res.status(401).jsend.fail({ err })
      })
      .catch(function (error: any) {
        res.status(500).jsend.error(error.message)
      })
  })

router.get('/:contact_id/messages', checkJwt,
  checkJwtErr,
  checkScopes([scopes.MessageRead, scopes.VolubleAdmin]),
  checkUserOrganization,
  function (req, res, next) {
    let contact_id = req.params.contact_id
    if (!validator.isUUID(contact_id)) {
      throw new errs.ValidationError("Supplied parameter contact_id is not a UUID: " + contact_id)
    }

    MessageManager.getMessagesForContact(contact_id)
      .then(function (messages) {
        res.status(200).jsend.success({ messages })
      })
      .catch(function (err) {
        if (err instanceof errs.NotFoundError) {
          res.status(404).jsend.fail({ "id": "No contact exists with this ID." })
        } else {
          res.status(500).jsend.error(err)
        }
      })
  })

module.exports = router;