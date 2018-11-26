import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

import * as utilities from '../utilities'

describe('Utilities', function () {
    describe('verifyNumberIsInteger', function () {
        it('should verify a number is an integer', function () {
            let x = 100

            chai.expect(utilities.verifyNumberIsInteger(x)).to.eventually.equal(x)
        })

        it('should convert a decimal to an integer', function () {
            let x = 100.6
            chai.expect(utilities.verifyNumberIsInteger(x)).to.eventually.equal(100)
        })

        it('should convert a string to an integer', function () {
            let x = "100"
            chai.expect(utilities.verifyNumberIsInteger(x)).to.eventually.equal(100)
        })
    })
})