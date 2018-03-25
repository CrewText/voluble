import * as Promise from "bluebird"

/**
 * Confirms that the supplied ID is a valid number.
 * @param {string} id String to confirm is a valid integer
 * @returns {promise} containing value of the ID number as integer
 */

export function verifyNumberIsInteger(id:string|number): Promise<number> {
    let parsed_id = parseInt(id, 10)
    if (parsed_id === NaN) {
      return Promise.reject(`Supplied number is not an integer: ${id}`)
    }
    else {
      return Promise.resolve(parsed_id)
    }
}

//module.exports.verifyNumberIsInteger = verifyNumberIsInteger
