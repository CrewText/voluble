if (process.env.PATH.includes("/app/.heroku") || process.env.CIRRUS_CI) {
    console.info("Running on Heroku/CI, using local config vars")
} else {
    console.info("Importing .env config vars")
    const config = require('dotenv').config()
    if (config.error) {
        throw config.error
    }
}

process.env.NODE_ENV = "test"

import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as faker from 'faker'
import * as supertest from 'supertest'
import * as server from '../server/server-main'
import { getAccessToken, satisfiesJsonApiError, satisfiesJsonApiResource, satisfiesJsonApiResourceRelationship, satisfiesJsonApiRelatedResource } from './test-utils'

chai.use(chaiAsPromised)
let auth_token: string
let server_app;

let created_contact_id: string;

describe('/v1/orgs/<org-id>/contacts', function () {

    // Setup auth_token
    this.beforeAll(async function () {
        console.log(`Setting up server and access token`)

        return Promise.all([server.initServer(), getAccessToken()])
            .then(([server, token]) => {
                server_app = server
                auth_token = token
                return true
            })
    })

    this.afterAll((done) => {
        server.shutdownServer().then(() => { done() })
    })


    let test_org_id: string
    let test_sc_id: string
    let test_cat_id: string
    let test_services: any[]

    // Setup test_org_id
    this.beforeAll((done) => {
        console.log(`Setting up test org`)
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
        console.log(`Setting up test services`)
        supertest(server_app)
            .get("/v1/services")
            .auth(auth_token, { type: "bearer" })
            .expect(200)
            .end((err, res) => {
                if (err) { console.log(err); console.log(res.error); return done(err) }
                let response = res.body.data
                chai.expect(response).to.be.instanceof(Array)

                response.forEach(service => {
                    chai.expect(service).to.have.property('id')
                    chai.expect(service.attributes).to.have.property('name')
                    chai.expect(service.attributes).to.have.property('directory_name')
                });
                test_services = response
                done()
            })
    }))

    // Setup test_sc_id
    this.beforeAll(function (done) {
        console.log(`Setting up test servicechain`)
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
                if (err) { console.log(err); console.log(res.error); return done(err) }
                let response = res.body.data
                chai.expect(response).to.have.property('id')
                chai.expect(response.attributes).to.have.property('name')
                chai.expect(response.attributes).to.have.property('services')

                chai.expect(response.attributes.services).to.be.instanceOf(Array)
                response.attributes.services.forEach(svc => {
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
        console.log(`Setting up test category`)
        if (!test_org_id) { this.skip() }
        let cat_name = faker.name.jobArea()
        supertest(server_app)
            .post(`/v1/orgs/${test_org_id}/categories`)
            .auth(auth_token, { type: "bearer" })
            .send({ name: cat_name })
            .expect(201)
            .end((err, res) => {
                if (err) { console.log(err.message); return done(err) }

                let data: any = res.body.data
                chai.expect(data.attributes).to.have.property('name', cat_name)
                chai.expect(data.relationships).to.have.property('organization')
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
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should create a new contact", function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_title = faker.name.title()
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname).toLowerCase()

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    title: contact_title,
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    servicechain: test_sc_id,
                    category: test_cat_id
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title', contact_title)
                    chai.expect(res.body.data.attributes).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data.attributes).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data.attributes).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    chai.expect(res.body.data.attributes).to.have.property('email_address', contact_email)
                    created_contact_id = res.body.data.id
                    done()
                })
        })

        it('should create a new contact without an optional email address', function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_title = faker.name.title()
            let contact_phone = faker.phone.phoneNumber("+4474########")

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    title: contact_title,
                    phone_number: contact_phone,
                    servicechain: test_sc_id,
                    category: test_cat_id
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title', contact_title)
                    chai.expect(res.body.data.attributes).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data.attributes).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data.attributes).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    done()
                })
        })

        it("should create a new contact without an optional category", function (done) {
            if (!test_org_id || !test_sc_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_title = faker.name.title()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname)

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    first_name: contact_fname,
                    surname: contact_sname,
                    title: contact_title,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    servicechain: test_sc_id,
                })
                .expect(201)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title', contact_title)
                    chai.expect(res.body.data.attributes).to.have.property('first_name', contact_fname)
                    chai.expect(res.body.data.attributes).to.have.property('surname', contact_sname)
                    chai.expect(res.body.data.attributes).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    chai.expect(res.body.data.attributes).to.have.property('email_address', contact_email)
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
                    title: faker.name.title(),
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    category: test_cat_id
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail to create a new contact without a title', function (done) {
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
                    category: test_cat_id,
                    servicechain: test_sc_id
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail to create a new contact with extraneous parameters', function (done) {
            if (!test_org_id) { this.skip() }
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+4474########")
            let contact_email = faker.internet.email(contact_fname, contact_sname)

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/contacts`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    title: faker.name.title(),
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    category: test_cat_id,
                    servicechain: test_sc_id,
                    randomCustomParameter: "completerubbish"
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    title: faker.name.title(),
                    first_name: contact_fname,
                    surname: contact_sname,
                    phone_number: contact_phone,
                    email_address: contact_email,
                    servicechain: test_sc_id
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.error(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail if we provide an invalid offset value (string)', function (done) {
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts?offset=cheese`)
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail if we provide an invalid offset value (negative number)', function (done) {
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/contacts?offset=-28`)
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.error(res.body); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body.data).to.be.instanceOf(Array)
                    res.body.data.forEach(contact => {
                        satisfiesJsonApiResource(contact, 'contact')
                        satisfiesJsonApiRelatedResource(contact, 'organization', 'organization', test_org_id)

                        chai.expect(contact.attributes).to.have.property('title')
                        chai.expect(contact.attributes).to.have.property('first_name')
                        chai.expect(contact.attributes).to.have.property('surname')
                        chai.expect(contact.attributes).to.have.property('phone_number')
                        chai.expect(contact.attributes).to.have.property('email_address')
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title')
                    chai.expect(res.body.data.attributes).to.have.property('first_name', new_first_name)
                    chai.expect(res.body.data.attributes).to.have.property('surname', new_surname)
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    chai.expect(res.body.data.attributes).to.have.property('email_address')
                    done()
                })
        })

        it("should change the contact's title", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_title = faker.name.title()
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    title: new_title
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title', new_title)
                    chai.expect(res.body.data.attributes).to.have.property('first_name')
                    chai.expect(res.body.data.attributes).to.have.property('surname')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    chai.expect(res.body.data.attributes).to.have.property('email_address')
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title')
                    chai.expect(res.body.data.attributes).to.have.property('first_name')
                    chai.expect(res.body.data.attributes).to.have.property('surname')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    chai.expect(res.body.data.attributes).to.have.property('email_address', new_email)
                    done()
                })
        })

        it("should fail to change the contact's email to an invalid address", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            let new_email = "this is not an email address"
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    email_address: new_email
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'category': { 'related': `/orgs/${test_org_id}/categories/${test_cat_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', test_cat_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title')
                    chai.expect(res.body.data.attributes).to.have.property('first_name')
                    chai.expect(res.body.data.attributes).to.have.property('surname')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    chai.expect(res.body.data.attributes).to.have.property('email_address', null)
                    done()
                })
        })

        it("should fail to change the contact's category to a non-existent category", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    category: "non-existent-category"
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should remove the contact's category", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    category: null
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', null)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title')
                    chai.expect(res.body.data.attributes).to.have.property('first_name')
                    chai.expect(res.body.data.attributes).to.have.property('surname')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                    done()
                })
        })

        it("should fail to change the contact's phone number to an invalid number", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    phone_number: "not a phone number"
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'contact')
                    satisfiesJsonApiResourceRelationship(res.body.data,
                        {
                            'organization': { 'related': `/orgs/${test_org_id}` },
                            'servicechain': { 'related': `/orgs/${test_org_id}/servicechains/${test_sc_id}` }
                        })
                    satisfiesJsonApiRelatedResource(res.body.data, 'organization', 'organization', test_org_id)
                    satisfiesJsonApiRelatedResource(res.body.data, 'category', 'category', null)
                    satisfiesJsonApiRelatedResource(res.body.data, 'servicechain', 'servicechain', test_sc_id)

                    chai.expect(res.body.data.attributes).to.have.property('title')
                    chai.expect(res.body.data.attributes).to.have.property('first_name')
                    chai.expect(res.body.data.attributes).to.have.property('surname')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number', new_phone) // Not checking value, as Voluble may change the format
                    done()
                })
        })

        it("should fail to change the contact's servicechain to a non-existent servicechain", function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    servicechain: "not a sc ID"
                })
                .expect(400)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should remove the contact we created', function (done) {
            if (!test_org_id || !created_contact_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/contacts/${created_contact_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(204)
                .end(function (err, res) {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.be.empty
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })
    })
})
