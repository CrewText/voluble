import * as Promise from "bluebird"
import { isNumber } from "util";
import * as isInt from "validator/lib/isInt"
import * as toInt from "validator/lib/toInt"

/**
 * Confirms that the supplied ID is a valid number.
 * @param {string} id String to confirm is a valid integer
 * @returns {promise} containing value of the ID number as integer
 */

export function verifyNumberIsInteger(id: string | number): Promise<number> {

  if (typeof id == "number") {
    let int_num = toInt(id.toString(), 10)
    if (!int_num) { return Promise.reject(`${id} is not an integer`) }
    return Promise.resolve(int_num)
  }
  else{
    if (isInt(id)){
      return Promise.resolve(toInt(id))
    }
    return Promise.reject(`${id} is not an integer`)
  }

}

//module.exports.verifyNumberIsInteger = verifyNumberIsInteger
