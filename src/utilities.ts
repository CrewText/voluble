import * as Promise from "bluebird"
import { isNumber } from "util";
import * as isInt from "validator/lib/isInt"
import * as toInt from "validator/lib/toInt"
const errs = require('common-errors')

/**
 * Confirms that the supplied ID is a valid number.
 * @param {string} id String to confirm is a valid integer
 * @returns {promise} containing value of the ID number as integer
 */

export function verifyNumberIsInteger(id: string | number): Promise<number> {

  if (id === 0 || id === "0") { return Promise.resolve(0) }
  if (typeof id == "number") {
    let int_num = toInt(id.toString(), 10)
    if (!int_num) { return Promise.reject(new errs.TypeError(`${id} is not an integer`)) }
    return Promise.resolve(int_num)
  }
  else {
    if (isInt(id)) {
      return Promise.resolve(toInt(id))
    }
    return Promise.reject(new errs.TypeError(`${id} is not an integer`))
  }

}

//module.exports.verifyNumberIsInteger = verifyNumberIsInteger
