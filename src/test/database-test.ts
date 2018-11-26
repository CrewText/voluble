import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
process.env.NODE_ENV = "test"
import * as faker from 'faker'
import * as db from '../models'
chai.use(chaiAsPromised)

import * as MessageManager from '../message-manager'
import { ServicechainManager } from '../servicechain-manager';

describe('Database', function () {
    db.initialize_database()

    let contact_id = faker.random.uuid()
    let sc_id = faker.random.uuid()
    let sc_name = faker.random.word()

    it('should create a new servicechain and save without error', function () {
        return chai.expect(ServicechainManager.createNewServicechain(
            sc_name,
            []
        ).then(function (sc) {
            sc_id = sc.id
            return sc
        })
        ).to.eventually.be.fulfilled.with.instanceof(db.models.Servicechain)
    })

    it('should create a new message and save without error', function () {

        return chai.expect(MessageManager.MessageManager.createMessage(
            faker.lorem.sentences(2),
            contact_id,
            "OUTBOUND",
            sc_id,
            MessageManager.MessageManager.MessageStates.MSG_PENDING
        )).to.eventually.be.fulfilled.with.instanceof(db.models.Message)
    })
})