import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')
import { UserManager } from '../bin/user-manager'

/* GET users listing. */
router.get('/', function (req, res, next) {
});

router.get('/:user_id', function (req, res, next) {
  UserManager.getUserProfile(req.params["user_id"])
    .then(function (user_profile) {
      res.status(200).json(user_profile)
    })
    .catch(function (error: any) {
      res.status(500).send(error.message)
    })
  //TODO: Add user authentication, make sure they're able to see the user they're asking for!
})

module.exports = router;