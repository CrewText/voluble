import * as express from "express";
import { UserManager } from '../../user-manager';
import { checkJwt, checkJwtErr, checkScopes } from '../security/jwt';
import { scopes } from '../security/scopes';
const router = express.Router();
const winston = require('winston')
const errs = require('common-errors')
/* GET users listing. */
router.get('/', checkJwt, checkJwtErr, checkScopes([scopes.UserView]), function (req, res, next) {
});

router.get('/:user_id', checkJwt, checkJwtErr, checkScopes([scopes.UserView]), function (req, res, next) {
  UserManager.getUserFullProfile(req.params["user_id"])
    .then(function (user_profile) {
      res.jsend.success(user_profile)
      //res.status(200).json(user_profile)
    })
    .catch(function (error: any) {
      res.jsend.error(error.message)
      //res.status(500).send(error.message)
    })
  //TODO: Add user authentication, make sure they're able to see the user they're asking for!
})

router.post('/', checkJwt, checkJwtErr, checkScopes([scopes.UserAdd]), function (req, res, next) {
  if (!req.body.auth0_id) {
    res.status(400).json({
      error: "Missing field: auth0_id"
    })
    return
  }

  //FIXME: Sort out user addition again
  // It's not actual user addition that needs doing, as Auth0 handles all of this for us
  // It's more that we need to keep track of the users that Auth0 has,
  // and make sure they join an organization
})

router.delete('/:voluble_user_id', checkJwt, checkJwtErr, checkScopes([scopes.UserDelete]), function (req, res, next) {
  //FIXME: Sort out user deletion again

  // UserManager.deleteUserFromVoluble(req.params.voluble_user_id)
  //   .then(function (user_deleted) {
  //     if (user_deleted) {
  //       res.status(204).send()
  //     } else {
  //       res.status(500).send()
  //     }
  //   })
  //   .catch(errs.NotFoundError, function (error) {
  //     res.status(404).json({
  //         error: `User not found: ${req.params.voluble_user_id}`
  //       })
  //   })

})

module.exports = router;