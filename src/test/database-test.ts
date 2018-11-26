import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
process.env.NODE_ENV = "test"
import * as faker from 'faker'
import * as db from '../models'
chai.use(chaiAsPromised)

import { MessageManager } from '../message-manager'
import { ServicechainManager } from '../servicechain-manager';
import { ContactManager } from '../contact-manager';
import { OrgManager } from '../org-manager';

console.log("Node Env: " + process.env.NODE_ENV)

describe('Database', function () {

    this.beforeAll(function (done) {
        //@ts-ignore
        faker.locale = "en_GB"
        db.initialize_database()
            .then(function () {
                done()
            })
    })

    let contact_id: string
    let contact_fname = faker.name.firstName()
    let contact_sname = faker.name.lastName()
    let contact_email = faker.internet.email(contact_fname, contact_sname)
    let contact_phone = faker.phone.phoneNumber("+447#########")
    let sc_id: string
    let sc_name = faker.random.word()
    let org_name = faker.company.companyName()
    let org_auth0_id = faker.random.uuid()

    it('should create a new servicechain and save without error', function () {
        let new_sc = ServicechainManager.createNewServicechain(sc_name).then(function (sc) {
            sc_id = sc.id
            return sc
        })
        return chai.expect(new_sc).to.eventually.be.fulfilled.with.instanceof(db.models.Servicechain)
    })

    it('should create a new contact (no org) with SC created, and save without error', function () {
        this.retries(3) // Sometimes, faker generates an email address that doesn't jive with sequelize
        let new_contact = ContactManager.createContact(
            contact_fname,
            contact_sname,
            contact_email,
            contact_phone,
            sc_id
        ).then(function (contact) {
            contact_id = contact.id
            return contact
        })
        return chai.expect(new_contact).to.eventually.be.fulfilled.with.instanceof(db.models.Contact)
    })

    it('should create a new message (no blast) with SC and contact created, and save without error', function () {
        let new_message = MessageManager.createMessage(
            faker.lorem.sentences(2),
            contact_id,
            "OUTBOUND",
            sc_id,
            MessageManager.MessageStates.MSG_PENDING
        )
        return chai.expect(new_message).to.eventually.be.fulfilled.with.instanceof(db.models.Message)
    })

    it('should create a new (fictional) service')

    it('should add the created service to the created servicechain, priority 1')

    it('should create a new blast')

    it('should create a new organization', function () {
        let new_org = OrgManager.createNewOrganization(org_name, org_auth0_id)
        return chai.expect(new_org).to.eventually.be.fulfilled.with.instanceof(db.models.Organization)
    })

    it('should add the created user to the organization')
})