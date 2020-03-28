import * as express from "express";
import * as validator from 'validator';
import { scopes } from "voluble-common";
import * as winston from 'winston';
import { CategoryManager, ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager';
import { OrgManager } from "../../org-manager";
import { ServicechainManager } from '../../servicechain-manager';
import { getE164PhoneNumber } from "../../utilities";
import { InvalidParameterValueError, ResourceNotFoundError, ResourceOutOfUserScopeError } from '../../voluble-errors';
import { checkLimit, checkOffset } from '../helpers/check_limit_offset';
import { checkJwt, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';
import { Contact } from "../../models/contact";
import { checkExtendsModel } from "../helpers/check_extends_model";

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'ContactsRoute' })
const router = express.Router();

/**
 * Handles the route `GET /contacts`.
 * List the available contacts to the user, within the boundaries provided by 'offset' and 'limit'.
 */
router.get('/:org_id/contacts', checkJwt,

  checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkLimit(0, 100),
  checkOffset(0),
  async function (req, res, next) {
    try {
      let offset: number = req.query.offset ? validator.default.toInt(String(req.query.offset)) : 0
      let limit: number = req.query.limit ? validator.default.toInt(String(req.query.limit)) : 100

      checkHasOrgAccess(req['user'], req.params.org_id)

      let contacts = await ContactManager.getContacts(offset, limit, req.params.org_id)
      let serialized = await req.app.locals.serializer.serializeAsync('contact', contacts)
      res.status(200).json(serialized)
    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
        logger.error(e)
      }
    }
  })

router.get('/:org_id/contacts/count', checkJwt, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  (req, res, next) => {
    new Promise((res, rej) => {
      res(checkHasOrgAccess(req['user'], req.params.org_id))
    })
      .then(() => {
        return OrgManager.getOrganizationById(req.params.org_id)
      })
      .then(org => {
        return org.countContacts()
      })
      .then(c => {
        return res.status(200).json({ data: { count: c } })
      })
      .catch(e => {
        let serialized_err = res.app.locals.serializer.serializeError(e)
        if (e instanceof ResourceOutOfUserScopeError) {
          res.status(403).json(serialized_err)
        }
        else if (e instanceof ResourceNotFoundError) {
          res.status(400).json(serialized_err)
        }
        else {
          logger.error(e.message)
          res.status(500).json(serialized_err)
        }
      })
  })

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:org_id/contacts/:contact_id', checkJwt, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]), checkJwt, function (req, res, next) {
  ContactManager.checkContactWithIDExists(req.params.contact_id)
    .then(function (id) {
      return ContactManager.getContactWithId(id)
    })
    .then(function (user) {
      if (user) {
        return req.app.locals.serializer.serializeAsync('contact', user)
      } else { throw new ResourceNotFoundError(`User with ID ${req.params.contact_id} is not found!`) }
    })
    .then(serialized => {
      res.status(200).json(serialized)
    })
    .catch(function (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceNotFoundError) {
        res.status(404).json(serialized_err)
      } else {
        res.status(500).json(serialized_err)
      }
    })
})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 * 
 * 
 */
router.post('/:org_id/contacts', checkJwt,
  checkScopesMiddleware([scopes.ContactAdd, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  async function (req, res, next) {

    try {
      let contact_title: string = req.body["title"]
      let contact_fname: string = req.body["first_name"]
      let contact_sname: string = req.body["surname"]
      let contact_email: string = req.body["email_address"]
      let contact_phone: string = req.body["phone_number"]
      let contact_sc: string = req.body["servicechain"]
      let contact_cat: string = req.body["category"]
      let contact_org: string = req.params.org_id

      checkExtendsModel(req.body, Contact)
      checkHasOrgAccess(req['user'], contact_org)

      if (!contact_title || !contact_fname || !contact_sname || !contact_phone || !contact_sc) {
        throw new InvalidParameterValueError("First name, surname, title, phone number, or Servicechain not supplied.")
      }

      if (contact_email && (!(typeof contact_email == "string") || !validator.default.isEmail(contact_email, { require_tld: true }))) {
        throw new InvalidParameterValueError("Supplied parameter 'email_address' is not the correct format: " + contact_email)
      }

      let e164_phone_num: string
      try {
        e164_phone_num = getE164PhoneNumber(contact_phone)
      } catch {
        throw new InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + contact_phone)
      }

      /** Get all of the promises in motion, then we can await the results
       * as and when we need them, when they're already likely to be resolved */

      let org_p = OrgManager.getOrganizationById(contact_org)
      let cat_p = CategoryManager.getCategoryById(contact_cat)
      let sc_p = ServicechainManager.getServicechainById(contact_sc)

      let requested_org = await org_p

      if (!requested_org) {
        throw new ResourceNotFoundError(`Organization with ID ${contact_org} not found`)
      }

      if (contact_cat && (!await cat_p)) {
        throw new InvalidParameterValueError(`Supplied Category not found: ${contact_cat}`)
      }

      if (!await sc_p) {
        throw new ResourceNotFoundError(`Specified Servicechain ID ${contact_sc} does not exist`)
      }

      let created_contact = await requested_org.createContact({
        title: contact_title,
        servicechain: contact_sc,
        category: contact_cat,
        first_name: contact_fname,
        surname: contact_sname,
        email_address: contact_email,
        phone_number: e164_phone_num
      })

      let serialized = await req.app.locals.serializer.serializeAsync('contact', await created_contact.reload())
      res.status(201).json(serialized)
    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceNotFoundError || e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      }
      else {
        res.status(500).json(serialized_err)
        logger.error(e.name, e.message)
      }
    }


  })

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:org_id/contacts/:contact_id', checkJwt,
  checkScopesMiddleware([scopes.ContactEdit, scopes.VolubleAdmin]), async function (req, res, next) {
    try {
      checkHasOrgAccess(req['user'], req.params.org_id)

      let contact = await ContactManager.getContactWithId(req.params.contact_id)
      if (!contact) { throw new ResourceNotFoundError(`Contact not found: ${req.params.contact_id}`) }

      if (Object.keys(req.body).indexOf('category') > -1) {
        if (req.body.category != null) {
          let cat = await CategoryManager.getCategoryById(req.body.CategoryId)

          if (!cat) { throw new InvalidParameterValueError(`Category does not exist: ${req.body.CategoryId}`) }
          await contact.setCategory(cat.id)
        } else {
          await contact.setCategory(null)
        }
      }

      if (Object.keys(req.body).indexOf('servicechain') > -1) {
        let sc = await ServicechainManager.getServicechainById(req.body.ServicechainId)
        if (!sc) { throw new InvalidParameterValueError(`Servicechain does not exist: ${req.body.ServicechainId}`) }
        await contact.setServicechain(sc)
      }

      ["title", "first_name", "surname"].forEach(trait => {
        if (Object.keys(req.body).indexOf(trait) > -1) {
          contact.set(<keyof Contact>trait, req.body[trait])
        }
      });

      if (Object.keys(req.body).indexOf('phone_number') > -1) {
        let e164_phone_num: string
        try {
          e164_phone_num = getE164PhoneNumber(req.body.phone_number)
        } catch {
          throw new InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + req.body.phone_number)
        }

        contact.set('phone_number', e164_phone_num)
      }

      if (Object.keys(req.body).indexOf('email_address') > -1) {
        if (req.body.email_address != null && !validator.default.isEmail(req.body.email_address, { require_tld: true })) {
          throw new InvalidParameterValueError("Supplied parameter 'email_address' is not the correct format: " + req.body.email_address)
        } else {
          contact.set('email_address', req.body.email_address)
        }
      }

      await contact.save()

      let serialized = await req.app.locals.serializer.serializeAsync('contact', await contact.reload())
      res.status(200).json(serialized)
    } catch (e) {
      let serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      }
      else if (e instanceof InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else {

        res.status(500).json(serialized_err)
        logger.error(e.message)
      }
    }
  })

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence. This is why there is no validation that the contact exists first.
 */
router.delete('/:org_id/contacts/:contact_id',
  checkJwt,

  setupUserOrganizationMiddleware,
  checkHasOrgAccessMiddleware,
  checkScopesMiddleware([scopes.ContactDelete, scopes.VolubleAdmin]), function (req, res, next) {

    let contact_id = req.params.contact_id

    return ContactManager.getContactWithId(contact_id)
      .then(function (contact) {
        if (!contact) {
          return false // Because idempotence
        }

        return contact.destroy()
          .then(function () { return true })
      })
      .then(function (resp) {
        res.status(resp ? 204 : 404).json({})
      })
      .catch(function (e: any) {
        let serialized_err = req.app.locals.serializer.serializeError(e)
        res.status(500).json(serialized_err)
      })
  })

router.get('/:org_id/contacts/:contact_id/messages', checkJwt,

  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkLimit(0, 100),
  checkOffset(0),
  function (req, res, next) {
    let contact_id = req.params.contact_id
    MessageManager.getMessagesForContact(contact_id, req.query.limit, req.query.offset)
      .then(function (messages) {
        return req.app.locals.serializer.serializeAsync('message')
      })
      .then(serialized => {
        res.status(200).json(serialized)
      })
      .catch(function (e) {
        let serialized_err = req.app.locals.serializer.serializeError(e)
        if (e instanceof ResourceNotFoundError) {
          res.status(404).json(serialized_err)
        } else {
          res.status(500).json(serialized_err)
        }
      })
  })

module.exports = router;