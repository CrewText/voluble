import * as express from "express";
import * as validator from 'validator';
import { errors, scopes } from "voluble-common";

import { CategoryManager, ContactManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager';
import { Contact } from "../../models/contact";
import { OrgManager } from "../../org-manager";
import { ServicechainManager } from '../../servicechain-manager';
import { getE164PhoneNumber } from "../../utilities";
import { checkExtendsModel } from "../helpers/check_extends_model";
import { checkLimit, checkOffset } from '../helpers/check_limit_offset';
import { checkJwt } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, checkHasOrgAccessParamMiddleware, checkScopesMiddleware, setupUserOrganizationMiddleware } from '../security/scopes';

//const logger = winston.loggers.get(process.title).child({ module: 'ContactsRoute' })
const router = express.Router();

/**
 * Handles the route `GET /contacts`.
 * List the available contacts to the user, within the boundaries provided by 'offset' and 'limit'.
 */
router.get('/:org_id/contacts',
  checkJwt,
  checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkLimit(0, 100),
  checkOffset(0),
  async (req, res, next) => {
    try {
      const offset: number = req.query.offset ? validator.default.toInt(String(req.query.offset)) : 0
      const limit: number = req.query.limit ? validator.default.toInt(String(req.query.limit)) : 100

      checkHasOrgAccess(req['user'], req.params.org_id)

      const contacts = await ContactManager.getContacts(offset, limit, req.params.org_id)
      res.status(200).json(req.app.locals.serializer.serialize('contact', contacts))
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof errors.InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else { next(e) }
    }
  })

router.get('/:org_id/contacts/count', checkJwt, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin, scopes.OrganizationOwner]),
  async (req, res, next) => {
    try {
      checkHasOrgAccess(req['user'], req.params.org_id)

      const org = await OrgManager.getOrganizationById(req.params.org_id)
      res.status(200).json({ data: { count: await org.countContacts() } })
      return next()
    } catch (e) {
      const serialized_err = res.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      }
      else if (e instanceof errors.ResourceNotFoundError) {
        res.status(400).json(serialized_err)
      }
      else { next(e) }
    }
  })

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:org_id/contacts/:contact_id', checkJwt,
  checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
  checkHasOrgAccessParamMiddleware('org_id'),
  async (req, res, next) => {
    try {
      const contact = await ContactManager.getContactWithId(req.params.contact_id)
      if (!contact) { throw new errors.ResourceNotFoundError(`Contact not found: ${req.params.contact_id}`) }
      res.status(200).json(req.app.locals.serializer.serialize('contact', contact))
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceNotFoundError) {
        res.status(404).json(serialized_err)
      } else { next(e) }
    }
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
  async (req, res, next) => {
    try {
      const contact_title: string = req.body["title"]
      const contact_fname: string = req.body["first_name"]
      const contact_sname: string = req.body["surname"]
      const contact_email: string = req.body["email_address"]
      const contact_phone: string = req.body["phone_number"]
      const contact_sc: string = req.body["servicechain"]
      const contact_cat: string = req.body["category"]
      const contact_org: string = req.params.org_id

      checkExtendsModel(req.body, Contact)
      checkHasOrgAccess(req['user'], contact_org)

      if (!contact_title || !contact_fname || !contact_sname || !contact_phone || !contact_sc) {
        throw new errors.InvalidParameterValueError("First name, surname, title, phone number, or Servicechain not supplied.")
      }

      if (contact_email && (!(typeof contact_email == "string") || !validator.default.isEmail(contact_email, { require_tld: true }))) {
        throw new errors.InvalidParameterValueError("Supplied parameter 'email_address' is not the correct format: " + contact_email)
      }

      let e164_phone_num: string
      try {
        e164_phone_num = getE164PhoneNumber(contact_phone)
      } catch {
        throw new errors.InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + contact_phone)
      }

      /** Get all of the promises in motion, then we can await the results
       * as and when we need them, when they're already likely to be resolved */

      const org_p = OrgManager.getOrganizationById(contact_org)
      const cat_p = CategoryManager.getCategoryById(contact_cat)
      const sc_p = ServicechainManager.getServicechainById(contact_sc)

      const requested_org = await org_p

      if (!requested_org) {
        throw new errors.ResourceNotFoundError(`Organization with ID ${contact_org} not found`)
      }

      if (contact_cat && (!await cat_p)) {
        throw new errors.InvalidParameterValueError(`Supplied Category not found: ${contact_cat}`)
      }

      if (!await sc_p) {
        throw new errors.ResourceNotFoundError(`Specified Servicechain ID ${contact_sc} does not exist`)
      }

      const created_contact = await requested_org.createContact({
        title: contact_title,
        servicechain: contact_sc,
        category: contact_cat,
        first_name: contact_fname,
        surname: contact_sname,
        email_address: contact_email,
        phone_number: e164_phone_num
      })

      const serialized = req.app.locals.serializer.serialize('contact', await created_contact.reload())
      res.status(201).json(serialized)
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceNotFoundError || e instanceof errors.InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      }
      else { next(e) }
    }
  })

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:org_id/contacts/:contact_id', checkJwt,
  checkScopesMiddleware([scopes.ContactEdit, scopes.VolubleAdmin]),
  async (req, res, next) => {
    try {
      checkHasOrgAccess(req['user'], req.params.org_id)

      const contact = await ContactManager.getContactWithId(req.params.contact_id)
      if (!contact) { throw new errors.ResourceNotFoundError(`Contact not found: ${req.params.contact_id}`) }

      const detailsToUpdate: Partial<Contact> = {}

      if (Object.keys(req.body).indexOf('category') > -1) {
        if (req.body.category != null) {
          const cat = await CategoryManager.getCategoryById(req.body.CategoryId)

          if (!cat) { throw new errors.InvalidParameterValueError(`Category does not exist: ${req.body.CategoryId}`) }
          // await contact.setCategory(cat.id)
          detailsToUpdate.category = cat.id;
        } else {
          // await contact.setCategory(null)
          detailsToUpdate.category = null;
        }
      }

      if (Object.keys(req.body).indexOf('servicechain') > -1) {
        const sc = await ServicechainManager.getServicechainById(req.body.ServicechainId)
        if (!sc) { throw new errors.InvalidParameterValueError(`Servicechain does not exist: ${req.body.ServicechainId}`) }
        //await contact.setServicechain(sc)
        detailsToUpdate.servicechain = sc.id
      }

      ["title", "first_name", "surname"].forEach(trait => {
        if (Object.keys(req.body).includes(trait)) { detailsToUpdate[trait] = req.body[trait] }
      });
      if (Object.keys(req.body).indexOf('phone_number') > -1) {
        let e164_phone_num: string
        try {
          e164_phone_num = getE164PhoneNumber(req.body.phone_number)
        } catch {
          throw new errors.InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + req.body.phone_number)
        }

        detailsToUpdate.phone_number = e164_phone_num
      }

      if (Object.keys(req.body).indexOf('email_address') > -1) {
        if (req.body.email_address != null && !validator.default.isEmail(req.body.email_address, { require_tld: true })) {
          throw new errors.InvalidParameterValueError("Supplied parameter 'email_address' is not the correct format: " + req.body.email_address)
        } else {
          detailsToUpdate.email_address = req.body.email_address
        }
      }

      await ContactManager.updateContactDetailsWithId(contact.id, detailsToUpdate)
      // contact = await contact.reload()

      res.status(200).json(req.app.locals.serializer.serialize('contact', await contact.reload()))
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceOutOfUserScopeError) {
        res.status(403).json(serialized_err)
      } else if (e instanceof errors.InvalidParameterValueError) {
        res.status(400).json(serialized_err)
      } else { next(e) }
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
  checkScopesMiddleware([scopes.ContactDelete, scopes.VolubleAdmin]), async (req, res, next) => {

    const contact_id = req.params.contact_id
    const contact = await ContactManager.getContactWithId(contact_id)

    if (!contact) {
      res.status(404)
    } else {
      contact.destroy()
      res.status(204)
    }
    res.json({})
    return next()
  })

router.get('/:org_id/contacts/:contact_id/messages',
  checkJwt,
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  checkLimit(0, 100),
  checkOffset(0),
  async (req, res, next) => {
    const contact_id = req.params.contact_id
    try {
      const msgs = await MessageManager.getMessagesForContact(contact_id, parseInt(req.query.limit as string), parseInt(req.query.offset as string))
      res.status(200).json(req.app.locals.serializer.serializeAsync('message', msgs))
      return next()
    } catch (e) {
      const serialized_err = req.app.locals.serializer.serializeError(e)
      if (e instanceof errors.ResourceNotFoundError) {
        res.status(404).json(serialized_err)
      } else { next(e) }
    }
  })

export default router;