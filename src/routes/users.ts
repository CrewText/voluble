import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')
import {UserManager} from '../bin/user-manager'

/* GET users listing. */
router.get('/', function(req, res, next) {
});

module.exports = router;