const express = require('express');
const Q = require('Q')
const dbClient = require('mariasql');
const router = express.Router();
const utils = require('../utilities.js')
const messageManager = require('../bin/message-manager/message-manager')

function getHundredMessageIds(db, offset = 0) {
  let deferred = Q.defer()

  db.query("CALL GetOneHundredMessages(?)", offset, function (err, row) {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve(rows)
    }
  })


  return deferred.promise
}

router.get('/', function (req, res, next) {
  let client = new dbClient(req.app.locals.db_credentials);

  // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
  let offset = req.query.offset == {} ? 0 : req.query.offset

  utils.verifyNumberIsInteger(offset)
    .then(function (rows) {
      res.status(200).json(rows)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })
    .finally(function () {
      client.end()
    })
    .done()
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.get('/{id}', function (req, res, next) {
  res.render('message_info', { contact_id: id })
})

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function (req, res, next) {
  // Create the message
  messageManager.c



  // Register the message in the database
  // Send the message
})

module.exports = router;