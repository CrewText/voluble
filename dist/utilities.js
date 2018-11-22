"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const isInt = require("validator/lib/isInt");
const toInt = require("validator/lib/toInt");
const errs = require('common-errors');
function verifyNumberIsInteger(id) {
    if (typeof id == "number") {
        let int_num = toInt(id.toString(), 10);
        if (!int_num) {
            return Promise.reject(new errs.TypeError(`${id} is not an integer`));
        }
        return Promise.resolve(int_num);
    }
    else {
        if (isInt(id)) {
            return Promise.resolve(toInt(id));
        }
        return Promise.reject(new errs.TypeError(`${id} is not an integer`));
    }
}
exports.verifyNumberIsInteger = verifyNumberIsInteger;
