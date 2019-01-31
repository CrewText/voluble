process.env.NODE_ENV = "test"
console.log("Node Env: " + process.env.NODE_ENV)
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as faker from 'faker';
import { MessageStates } from 'voluble-common';
import { ContactManager } from '../contact-manager';
import { MessageManager } from '../message-manager';
import * as db from '../models';
import { OrgManager } from '../org-manager';
import { ServicechainManager } from '../servicechain-manager';
chai.use(chaiAsPromised)

describe('Database', function () {

    this.beforeAll(function (done) {
        //@ts-ignore
        faker.locale = "en_GB"
        db.initialize_database()
            .then(function () {
                done()
            })
    })

    let message_id: string
    let contact_id: string
    let contact_fname = faker.name.firstName()
    let contact_sname = faker.name.lastName()
    let contact_email = faker.internet.email(contact_fname, contact_sname)
    //console.log(`Email:  ${contact_email}`)
    let contact_phone = faker.phone.phoneNumber("+447426######")
    let sc_id: string
    let sc_name = faker.random.word()
    let org_id: string
    let org_name = faker.company.companyName()
    let org_phone = faker.phone.phoneNumber("+447426######")

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
            MessageStates.MSG_PENDING
        ).then(function (message) {
            message_id = message.id
            return message
        })
        return chai.expect(new_message).to.eventually.be.fulfilled.with.instanceof(db.models.Message)
    })

    it('should retrieve the last message only through getHundredMessageIds', function () {
        let messages = MessageManager.getHundredMessageIds()
        return chai.expect(messages).to.eventually.be.fulfilled
    })

    it('should update the status of the created message to MSG_DELIVERED_USER', function () {
        let message_updated = MessageManager.updateMessageState(message_id, MessageStates.MSG_DELIVERED_USER)
            .then(function (message) {
                return message.message_state
            })
        chai.expect(message_updated).to.eventually.be.equal(MessageStates.MSG_DELIVERED_USER)
    })

    it('should add the created service to the created servicechain, priority 1')

    it('should create a new blast')

    it('should create a new organization', function () {
        let new_org = OrgManager.createNewOrganization(org_name, org_phone)
            .then(function (org) {
                org_id = org.id
                return org
            })
        return chai.expect(new_org).to.eventually.be.fulfilled.with.instanceof(db.models.Organization)
    })

    it('should add the created user to the organization', function () {
        let org_has_contact = OrgManager.getOrganizationById(org_id)
            .then(function (org) {
                return ContactManager.getContactWithId(contact_id)
                    .then(function (contact) {
                        return org.addContact(contact)
                    }).then(function () {
                        return org.hasContact(contact_id)
                    })
            })

        chai.expect(org_has_contact).to.eventually.be.true
    })
})