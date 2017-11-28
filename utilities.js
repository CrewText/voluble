var Q = require('q');

/**
 * Confirms that the supplied ID is a valid number.
 * @param {string} id String to confirm is a valid integer
 * @returns {Q.promise} containing value of the ID number as integer
 */

function verifyNumberIsInteger(id) {
    let deferred = Q.defer()

    if (id == "0"){
      deferred.resolve(0)
      return deferred.promise
    }
  
    let parsed_id = parseInt(id,10)
    if (!parsed_id) {
      deferred.reject(new Error("Supplied number is not an integer: " + id))
    }
    else {
      deferred.resolve(parsed_id)
    }
  
    return deferred.promise
  }
  module.exports.verifyNumberIsInteger = verifyNumberIsInteger

function verifyContactExists(id){
  let deferred = Q.defer()
  // TODO: Make this actually work
}
module.exports.verifyContactExists = verifyContactExists
