import * as Promise from "bluebird";
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as isInt from "validator/lib/isInt";
import * as toInt from "validator/lib/toInt";
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

export function getE164PhoneNumber(phone_number: string): string {
  let phone_utils = PhoneNumberUtil.getInstance()
  let parsed_number = phone_utils.parseAndKeepRawInput(phone_number)
  if (!phone_utils.isValidNumber(parsed_number)) {
    throw new errs.ValidationError("The supplied phone number is invalid.")
  } else {
    return phone_utils.format(parsed_number, PhoneNumberFormat.E164)
  }

}

//module.exports.verifyNumberIsInteger = verifyNumberIsInteger
