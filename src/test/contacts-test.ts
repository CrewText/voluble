
if (!process.env.PATH || process.env.PATH.lastIndexOf("/app/.heroku") == -1) {
    console.info("Importing .env config vars")
    const config = require('dotenv').config()
    if (config.error) {
        throw config.error
    }
} else {
    console.info("Running on Heroku, using local config vars")
}

process.env.NODE_ENV = "test"

import * as BBPromise from 'bluebird'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as faker from 'faker'
import * as supertest from 'supertest'
import { Service } from 'voluble-common'
import * as server from '../server/server-main'
import { getAccessToken } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;

let created_contact_id: string;

describe('/v1/orgs/<org-id>/contacts', function () {

    this.beforeAll(function (done) {
        this.timeout(5000)

        BBPromise.try(function () {
            return server.initServer()
        })
            .then(function (svr) {
                //Wait until the DB is up and running before we can use it
                server_app = svr
            })
            .then(async () => {
                auth_token = await getAccessToken()
                done()
            })
    })

    this.afterAll((done) => {
        // done()
        server.shutdownServer().then(() => { done() })
    })


    let test_org_id: string
    let test_sc_id: string
    let test_cat_id: string
    let test_services: Service[]

    // Setup test_org_id
    this.beforeAll((done) => {
        supertest(server_app)
            .post(`/v1/orgs`)
            .auth(auth_token, { type: "bearer" })
            .send({ name: "API Test Organization-CONTACTS TEST", phone_number: faker.phone.phoneNumber("+4474########") })
            .expect(201)
            .end((err, res) => {
                if (err) { console.log(err); return done(err) }
                test_org_id = res.body.data.id
                done()
            })
    })

    // Setup test_services
    this.beforeAll((done => {
        supertest(server_app)
            .get("/v1/services")
            .auth(auth_token, { type: "bearer" })
            .expect(200)
            .end((err, res) => {
                if (err) { done(err) }
                chai.expect(res.body).to.have.property('status', 'success')
                let response = res.body.data
                chai.expect(response).to.be.instanceof(Array)

                response.forEach(service => {
                    chai.expect(service).to.have.property('id')
                    chai.expect(service).to.have.property('name')
                    chai.expect(service).to.have.property('directory_name')
                });
                test_services = response
                done()
            })
    }))

    // Setup test_sc_id
    this.beforeAll(function (done) {
        if (!test_org_id) { this.skip() }

        supertest(server_app)
            .post(`/v1/orgs/${test_org_id}/servicechains`)
            .send({
                name: "API Test Servicechain",
                services: [{
                    "service": test_services[0].id,
                    "priority": 1
                }]
            })
            .auth(auth_token, { type: "bearer" })
            .expect(201)
            .end((err, res) => {
                if (err) { return done(err) }
                chai.expect(res.body).to.have.property('status', 'success')
                let response = res.body.data
                chai.expect(response).to.have.property('id')
                chai.expect(response).to.have.property('name')
                chai.expect(response).to.have.property('services')

                chai.expect(response.services).to.be.instanceOf(Array)
                response.services.forEach(svc => {
                    chai.expect(svc).to.have.property('id')
                    chai.expect(svc).to.have.property('service')
                    chai.expect(svc).to.have.property('priority')
                });
                test_sc_id = response.id
                done()
            })
    })

    // Setup test_cat_id
    this.beforeAll(function (done) {
        if (!test_org_id) { this.skip() }
        let cat_name = faker.name.jobArea()
        supertest(server_app)
            .post(`/v1/orgs/${test_org_id}/categories`)
            .auth(auth_token, { type: "bearer" })
            .send({ name: cat_name })
            .expect(201)
            .end((err, res) => {
                if (err) { console.log(err.message); return done(err) }
                chai.expect(res.body).to.have.property('status')
                chai.expect(res.body.status).to.equal("success")

                let data: any = res.body.data
                chai.expect(data).to.have.property('name', cat_name)
                chai.expect(data).to.have.property('OrganizationId', test_org_id)
                test_cat_id = data.id
                done()
            })
    })

    describe('POST /v1/orgs/<org-id>/contacts', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it("should create a new contact", function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname).toLowerCase()

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    ServicechainId: test_sc_id,
                    CategoryId: test_cat_id
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', "success")
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    chai.expect(res.body.data).to.have.property('email_address', contact_email)
                    chai.expect(res.body.data).to.have.property('OrganizationId', test_org_id)
                    chai.expect(res.body.data).to.have.property('ServicechainId', test_sc_id)
                    chai.expect(res.body.data).to.have.property('CategoryId', test_cat_id)
                    created_contact_id = res.body.data.id
                    done()
                })
        })

        it('should create a new contact without an optional email address', function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    ServicechainId: test_sc_id,
                    CategoryId: test_cat_id
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', "success")
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    chai.expect(res.body.data).to.have.property('email_address', null)
                    chai.expect(res.body.data).to.have.property('OrganizationId', test_org_id)
                    chai.expect(res.body.data).to.have.property('ServicechainId', test_sc_id)
                    chai.expect(res.body.data).to.have.property('CategoryId', test_cat_id)
                    created_contact_id = res.body.data.id
                    done()
                })
        })

        it("should create a new contact without an optional category", function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname)

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    ServicechainId: test_sc_id,
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', "success")
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    chai.expect(res.body.data).to.have.property('email_address', contact_email)
                    chai.expect(res.body.data).to.have.property('CategoryId', null)
                    chai.expect(res.body.data).to.have.property('OrganizationId', test_org_id)
                    chai.expect(res.body.data).to.have.property('ServicechainId', test_sc_id)
                    created_contact_id = res.body.data.id
                    done()
                })
        })

        it('should fail to create a new contact without a Servicechain', function (done) {
            if (!test_org_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname)

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    CategoryId: test_cat_id
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it("Should fail to create a new contact when the phone number is invalid", function (done) {
            if (!test_org_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = "12345123456"
            let contact_email = faker.internet.email(contact_fname, contact_sname)

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    ServicechainId: test_sc_id
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.error(res.body); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })
    })

    describe('GET /v1/orgs/<org-id>/contacts', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should fail if we provide an invalid offset value (string)', function (done) {
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts?offset=cheese`)
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should fail if we provide an invalid offset value (negative number)', function (done) {
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts?offset=-28`)
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should GET all of the contacts that our User allows', function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    if (err) { console.error(res.body); return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.be.instanceOf(Array)
                    res.body.data.forEach(contact => {
                        chai.expect(res.body.data[0]).to.have.property('id')
                        chai.expect(contact).to.have.property('first_name')
                        chai.expect(contact).to.have.property('surname')
                        chai.expect(contact).to.have.property('email_address')
                        chai.expect(contact).to.have.property('phone_number') // Not checking value, as Voluble may change the format

                        chai.expect(contact).to.have.property('OrganizationId', test_org_id)
                        chai.expect(contact).to.have.property('ServicechainId', test_sc_id)
                    });

                    done()
                })
        })
    })

    describe('PUT /v1/orgs/<org-id>/contacts', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it("should change the contact's first and second names", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_first_name = faker.name.firstName()
            let new_surname = faker.name.lastName()
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: new_first_name,
                    surname: new_surname
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property('first_name', new_first_name)
                    chai.expect(res.body.data).to.have.property('surname', new_surname)
                    done()
                })
        })

        it("should change the contact's email", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_email = faker.internet.exampleEmail()
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    email_address: new_email
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property("email_address", new_email)
                    done()
                })
        })

        it("should remove the contact's email", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    email_address: null
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property("email_address", null)
                    done()
                })
        })

        it("should remove the contact's category", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_email = faker.internet.exampleEmail()
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    CategoryId: null
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property("CategoryId", null)
                    done()
                })
        })

        it("should change the contact's phone number", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_phone = faker.phone.phoneNumber("+4474########")
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    phone_number: new_phone
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data).to.have.property("phone_number", new_phone)
                    done()
                })
        })
    })

    describe('DELETE /v1/contacts', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should remove the contact we created', function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    done()
                })
        })

        it('should attempt to remove the same contact again, to ensure idempotence', function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(404)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    done()
                })
        })
    })
})