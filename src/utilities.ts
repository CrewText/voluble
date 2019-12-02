// import * as Promise from "bluebird";
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

/**
 * 
 * @param {string} phone_number The phone number to conform to the E164 standard
 * @returns {string} The conformed phone numner
 * @throws {ValidationError} An error when the provided number cannot be conformed.
 */
export function getE164PhoneNumber(phone_number: string): string {
  let phone_utils = PhoneNumberUtil.getInstance()
  let parsed_number = phone_utils.parse(phone_number)
  if (!phone_utils.isValidNumber(parsed_number)) {
    throw new Error("The supplied phone number is invalid.")
  } else {
    return phone_utils.format(parsed_number, PhoneNumberFormat.E164)
  }

}