const Promise = require('bluebird')

/**
 * Confirms that the supplied ID is a valid number.
 * @param {string} id String to confirm is a valid integer
 * @returns {Q.promise} containing value of the ID number as integer
 */

function verifyNumberIsInteger(id) {
  return new Promise(function (resolve, reject) {
    if (id == "0") {
      resolve(0)
    }

    let parsed_id = parseInt(id, 10)
    if (!parsed_id) {
      reject(new Error("Supplied number is not an integer: " + id))
    }
    else {
      resolve(parsed_id)
    }
  })
}
module.exports.verifyNumberIsInteger = verifyNumberIsInteger

function verifyContactExists(id) {
  let deferred = Q.defer()
  // TODO: Make this actually work
  deferred.resolve(id)
  return deferred.promise
}
module.exports.verifyContactExists = verifyContactExists
