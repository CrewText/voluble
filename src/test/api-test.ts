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
console.log("Node Env: " + process.env.NODE_ENV)

import * as Promise from 'bluebird'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as faker from 'faker'
import * as request from 'request'
import * as supertest from 'supertest'
import * as db from '../models'
import * as server from '../server/server-main'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;

describe('API', function () {
    this.beforeAll(function (done) {
        this.timeout(5000)

        Promise.try(function () {
            return server.initServer()
        })
            .then(function (svr) {
                //Wait until the DB is up and running before we can use it
                server_app = svr
            })
            .then(() => {
                //@ts-ignore
                faker.locale = "en_GB"
                // Get an access_token from Auth0 on behalf of the Voluble Test Application
                let auth0_req_body = {
                    audience: process.env.AUTH0_API_ID,
                    grant_type: "client_credentials",
                    client_id: process.env.AUTH0_TEST_CLIENT_ID,
                    client_secret: process.env.AUTH0_TEST_CLIENT_SECRET
                }

                request.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
                    json: auth0_req_body
                }, (err, response, body) => {
                    if (err) { throw new Error(err) }
                    if (!body) {
                        this.skip()
                    }
                    if (!body.access_token) { throw new Error('No access token in Auth0 response') }
                    auth_token = body.access_token

                    done()
                })
            })
    })

    let created_org: string

    describe('/v1/orgs', function () {

        describe('POST /v1/orgs', function () {
            console.log("Auth token:")
            console.log(auth_token)
            it('should fail to create a new Organization when a name is not provided', function (done) {
                supertest(server_app)
                    .post("/v1/orgs")
                    .send({ phone_number: faker.phone.phoneNumber("+447436######") })
                    .auth(auth_token, { type: "bearer" })
                    .expect(400)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "fail")
                        done()
                    })
            })

            it('should create a new Organization', function (done) {
                supertest(server_app)
                    .post("/v1/orgs")
                    .auth(auth_token, { type: "bearer" })
                    .send({ name: "API Test Organization", phone_number: faker.phone.phoneNumber("+4474########") })
                    .expect(201)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        chai.expect(res.body.data).to.have.property('name')
                        chai.expect(res.body.data).to.have.property('phone_number')
                        created_org = res.body.data.id
                        done()
                    })
            })
        })

        describe('GET /v1/orgs', function () {
            it('should retrieve the new Organization in the collection', function (done) {
                supertest(server_app)
                    .get("/v1/orgs")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.be.instanceOf(Array)
                        let response = res.body.data
                        chai.expect(response).to.be.instanceOf(Array)
                        chai.expect(response).to.have.lengthOf(1)
                        chai.expect(response[0]).to.have.property('id', created_org)
                        chai.expect(response[0]).to.have.property('name')
                        chai.expect(response[0]).to.have.property('phone_number')
                        done()
                    })
            })

            it('should retrieve the created Organization by ID', function (done) {
                if (!created_org) { this.skip() }
                supertest(server_app)
                    .get(`/v1/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id', created_org)
                        chai.expect(res.body.data).to.have.property('name')
                        chai.expect(res.body.data).to.have.property('phone_number')
                        done()
                    })
            })

            it('should fail to retrieve the created Organization by ID without authorization', function (done) {
                if (!created_org) { this.skip() }
                supertest(server_app)
                    .get(`/v1/orgs/${created_org}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        done()
                    })
            })
        })

        describe('PUT /v1/orgs/<org-id>', function () {
            it("should change the name of the organization", function (done) {
                if (!created_org) { this.skip() }
                let new_org_name = faker.company.companyName()
                supertest(server_app)
                    .put(`/v1/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        name: new_org_name
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        let response = res.body.data
                        chai.expect(response).to.have.property('id', created_org)
                        chai.expect(response).to.have.property('phone_number')
                        chai.expect(response).to.have.property('name', new_org_name)
                        done()
                    })
            })

            it("should change the phone number of the organization", function (done) {
                if (!created_org) { this.skip() }

                let new_org_phone = faker.phone.phoneNumber("+4474########")
                supertest(server_app)
                    .put(`/v1/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        phone_number: new_org_phone
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        let response = res.body.data
                        chai.expect(response).to.have.property('id', created_org)
                        chai.expect(response).to.have.property('phone_number', new_org_phone)
                        chai.expect(response).to.have.property('name')
                        done()
                    })
            })
        })

        describe('DELETE /v1/orgs/<org-id>', function () {
            it('should remove the Org we created', function (done) {
                supertest(server_app)
                    .delete(`/v1/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        done()
                    })
            })

            it('should attempt to remove the same Org, to ensure idempotence', function (done) {
                supertest(server_app)
                    .delete(`/v1/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(410)
                    .end((err, res) => {
                        done()
                    })
            })
        })

        //TODO: MAKE USERS TESTS BE CORRECT, AND WRITE OPENAPI SPEC
        // describe('/v1/orgs/<org-id>/users', function () {
        //     this.beforeAll(function (done) {
        //         supertest(server_app)
        //             .post("/v1/orgs")
        //             .auth(auth_token, { type: "bearer" })
        //             .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+447426######") })
        //             .expect(201)
        //             .end((err, res) => {
        //                 if (err) { return done(err) }
        //                 chai.expect(res.body).to.have.property('status', "success")
        //                 chai.expect(res.body.data).to.have.property('id')
        //                 created_org = res.body.data.id
        //                 return done()
        //             })
        //     })

        //     let created_user_id: string;

        //     describe('POST /v1/orgs/<org-id>/users', function () {
        //         it("should create a new user and add it to the Org", function (done) {
        //             let new_user_auth0_id = faker.random.uuid()
        //             supertest(server_app)
        //                 .post(`/v1/orgs/${created_org}/users`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .send({ auth0_id: new_user_auth0_id })
        //                 .expect(201)
        //                 .end((err, res) => {
        //                     if (err) { return done(err) }
        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     chai.expect(res.body.data).to.have.property('id')
        //                     chai.expect(res.body.data).to.have.property('auth0_id', new_user_auth0_id)
        //                     chai.expect(res.body.data).to.have.property('OrganizationId', created_org)
        //                     created_user_id = res.body.data.id
        //                     done()
        //                 })
        //         })
        //     })

        //     describe('GET /v1/orgs/<org-id>/users', function () {
        //         console.log(created_user_id)
        //         it('should retrieve a list of the users in the Org', function (done) {
        //             if (!created_org || !created_user_id) { this.skip() }
        //             supertest(server_app)
        //                 .get(`/v1/orgs/${created_org}/users`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .expect(200)
        //                 .end((err, res) => {
        //                     if (err) { done(err) }
        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     chai.expect(res.body.data).to.be.instanceOf(Array)
        //                     chai.expect(res.body.data[0]).to.have.property('id', created_user_id)
        //                     done()
        //                 })
        //         })


        //         it('should retrieve the individual details of the new user', function (done) {
        //             if (!created_org || !created_user_id) { this.skip() }
        //             supertest(server_app)
        //                 .get(`/v1/orgs/${created_org}/users/${created_user_id}`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .expect(200)
        //                 .end((err, res) => {
        //                     if (err) { done(err) }
        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     chai.expect(res.body.data).to.have.property('id', created_user_id)
        //                     done()
        //                 })
        //         })
        //     })

        //     describe('PUT /v1/orgs/<org-id>/users', function () {
        //         let created_org_id_new: string;
        //         this.beforeAll(function (done) {
        //             supertest(server_app)
        //                 .post('/v1/orgs')
        //                 .auth(auth_token, { type: "bearer" })
        //                 .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+447426######") })
        //                 .expect(201)
        //                 .end(function (err, res) {
        //                     if (err) { return done(err) }
        //                     created_org_id_new = res.body.data.id
        //                     done()
        //                 })
        //         })
        //         it('should add an existing user to a new Org', function (done) {
        //             if (!created_user_id || !created_org_id_new) { this.skip() }
        //             supertest(server_app)
        //                 .put(`/v1/orgs/${created_org_id_new}/users`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .send({ user_id: created_user_id })
        //                 .expect(200)
        //                 .end((err, res) => {
        //                     if (err) { done(err) }
        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     let user = res.body.data
        //                     chai.expect(user).to.have.property('id', created_user_id)
        //                     chai.expect(user).to.have.property('OrganizationId', created_org_id_new)
        //                     done()
        //                 })
        //         })

        //         it('should add the same user to the same Org to ensure idempotence', function (done) {
        //             if (!created_user_id || !created_org_id_new) { this.skip() }
        //             supertest(server_app)
        //                 .put(`/v1/orgs/${created_org_id_new}/users`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .send({ user_id: created_user_id })
        //                 .expect(200)
        //                 .end((err, res) => {
        //                     if (err) { done(err) }
        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     let user = res.body.data
        //                     chai.expect(user).to.have.property('id', created_user_id)
        //                     chai.expect(user).to.have.property('OrganizationId', created_org_id_new)
        //                     done()
        //                 })
        //         })
        //     })

        //     describe('DELETE /v1/orgs/<org-id>/users/<user-id>', function () {
        //         it('should remove the new user from the Org', function (done) {
        //             supertest(server_app)
        //                 .delete(`/v1/orgs/${created_org}/users/${created_user_id}`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .expect(200)
        //                 .end((err, res) => {
        //                     if (err) { return done(err) }

        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     chai.expect(res.body).to.have.property('data', true)
        //                     done()
        //                 })
        //         })

        //         it('should remove the same user again to ensure idempotence', function (done) {
        //             supertest(server_app)
        //                 .delete(`/v1/orgs/${created_org}/users/${created_user_id}`)
        //                 .auth(auth_token, { type: "bearer" })
        //                 .expect(404)
        //                 .end((err, res) => {
        //                     if (err) { return done(err) }

        //                     chai.expect(res.body).to.have.property('status', 'success')
        //                     chai.expect(res.body).to.have.property('data', true)
        //                     done()
        //                 })
        //         })
        //     })

        // })

    })

    let available_services: db.ServiceInstance[];

    describe('/v1/services', function () {

        describe('GET /v1/services', function () {
            it('should return a list of available services', function (done) {
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
                        available_services = response
                        done()
                    })
            })
        })

        describe('GET /v1/services/<svc-id>', function () {
            it('should return the service with the specified ID', (done) => {
                supertest(server_app)
                    .get(`/v1/services/${available_services[0].id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        chai.expect(res.body.data).to.have.property('id')
                        chai.expect(res.body.data).to.have.property('name')
                        chai.expect(res.body.data).to.have.property('directory_name')
                        done()
                    })
            })
        })

    })

    let created_servicechain_id: string;
    describe('/v1/servicechains', function () {
        // TODO: A servicechain should be part of an organization!
        describe("POST /v1/servicechains", function () {
            it('should create a new servicechain with a service', function (done) {
                if (!available_services) { this.skip() }
                supertest(server_app)
                    .post("/v1/servicechains")
                    .send({
                        name: "API Test Servicechain",
                        services: [{
                            "service": available_services[0].id,
                            "priority": 1
                        }]
                    })
                    .auth(auth_token, { type: "bearer" })
                    .expect(201)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        console.log(res.body)
                        chai.expect(res.body).to.have.property('status', 'success')
                        let response = res.body.data
                        chai.expect(response).to.have.property('id')
                        chai.expect(response).to.have.property('name')
                        chai.expect(response).to.have.property('services')
                        chai.expect(response).to.have.property('OrganizationId')

                        response.services.forEach(svc => {
                            chai.expect(svc).to.have.property('id')
                            chai.expect(svc).to.have.property('service')
                            chai.expect(svc).to.have.property('servicechain')
                            chai.expect(svc).to.have.property('priority')
                        });
                        created_servicechain_id = response.id
                        done()
                    })
            })

            it("should fail when provided with a non-existent service ID", function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .post("/v1/servicechains")
                    .send({
                        name: "my servicechain",
                        services: [{
                            "service": faker.random.uuid(),
                            "priority": 1
                        }]
                    })
                    .auth(auth_token, { type: "bearer" })
                    .expect(400)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'fail')
                        done()
                    })
            })
        })

        describe("GET /v1/servicechains", function () {
            it('should retrieve a list of servicechains for our Org', function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .get("/v1/servicechains")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        let response = res.body.data
                        chai.expect(response).to.be.instanceOf(Array)

                        response.forEach(sc => {
                            chai.expect(sc).to.have.property('id')
                            chai.expect(sc).to.have.property('name')
                            chai.expect(sc).to.have.property('services')
                            chai.expect(sc).to.have.property('OrganizationId')

                            chai.expect(sc.services).to.be.instanceOf(Array)

                            sc.services.forEach(svc => {
                                chai.expect(svc).to.have.property('id')
                                chai.expect(svc).to.have.property('service')
                                chai.expect(svc).to.have.property('priority')
                                chai.expect(svc).to.have.property('servicechain')
                            });
                        });
                        done()
                    })
            })
        })

        describe("PUT /v1/servicechains", () => {
            it("should overwrite the existing service in the servicechain", function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .put(`/v1/servicechains/${created_servicechain_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        name: "API Test Servicechain Overwrite",
                        services: [{
                            "service": available_services[0].id,
                            "priority": 3
                        }]
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        let response = res.body.data
                        chai.expect(response).to.have.property('id', created_servicechain_id)
                        chai.expect(response).to.have.property('name')
                        chai.expect(response).to.have.property('services')

                        chai.expect(response.services).to.be.instanceOf(Array)
                        response.services.forEach(svc => {
                            chai.expect(svc).to.have.property('id')
                            chai.expect(svc).to.have.property('service')
                            chai.expect(svc).to.have.property('priority')
                        });
                        done()
                    })
            })

            it("should fail to overwrite when a non-existent service ID is provided", function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .put(`/v1/servicechains/${created_servicechain_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        name: "API Test Servicechain Overwrite",
                        services: [{
                            "service": faker.random.uuid(),
                            "priority": 3
                        }]
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'fail')
                        done()
                    })
            })
        })

        describe("DELETE /v1/servicechains", () => {
            it('should remove the SC we created', function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .delete(`/v1/servicechains/${created_servicechain_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        done()
                    })
            })

            it('should attempt to remove the same SC, to ensure idempotence', function (done) {
                if (!created_servicechain_id) { this.skip() }
                supertest(server_app)
                    .delete(`/v1/servicechains/${created_servicechain_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(410)
                    .end((err, res) => {
                        done()
                    })
            })
        })
    })

    let created_contact_id: string;

    describe('/v1/contacts', function () {
        let contact_test_org_id: string
        let contact_test_sc_id: string

        this.beforeAll((done) => {
            supertest(server_app)
                .post("/v1/orgs")
                .auth(auth_token, { type: "bearer" })
                .send({ name: "API Test Organization", phone_number: faker.phone.phoneNumber("+4474########") })
                .expect(201)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    contact_test_org_id = res.body.data.id
                    done()
                })
        })

        this.beforeAll((done) => {
            supertest(server_app)
                .post("/v1/servicechains")
                .send({
                    name: "API Test Servicechain",
                    services: [{
                        "service": available_services[0].id,
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
                    contact_test_sc_id = response.id
                    done()
                })
        })

        describe('POST /v1/contacts', function () {
            it("should create a new contact", function (done) {
                if (!contact_test_org_id) { this.skip() }
                let contact_fname = faker.name.firstName()
                let contact_sname = faker.name.lastName()
                let contact_phone = faker.phone.phoneNumber("+4474########")
                let contact_email = faker.internet.email(contact_fname, contact_sname)

                supertest(server_app)
                    .post("/v1/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        first_name: contact_fname,
                        surname: contact_sname,
                        phone_number: contact_phone,
                        email_address: contact_email,
                        OrganizationId: contact_test_org_id,
                        ServicechainId: contact_test_sc_id
                    })
                    .expect(201)
                    .end(function (err, res) {
                        if (err) { console.log(err); return done(err) }

                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        chai.expect(res.body.data).to.have.property('first_name', contact_fname)
                        chai.expect(res.body.data).to.have.property('surname', contact_sname)
                        chai.expect(res.body.data).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                        chai.expect(res.body.data).to.have.property('OrganizationId', contact_test_org_id)
                        chai.expect(res.body.data).to.have.property('ServicechainId', contact_test_sc_id)
                        created_contact_id = res.body.data.id
                        done()
                    })
            })

            it("Should fail to create a new contact when the phone number is invalid", function (done) {
                if (!contact_test_org_id) { this.skip() }
                let contact_fname = faker.name.firstName()
                let contact_sname = faker.name.lastName()
                let contact_phone = "12345123456"
                let contact_email = faker.internet.email(contact_fname, contact_sname)

                supertest(server_app)
                    .post("/v1/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        first_name: contact_fname,
                        surname: contact_sname,
                        phone_number: contact_phone,
                        email_address: contact_email,
                        OrganizationId: contact_test_org_id,
                        ServicechainId: contact_test_sc_id
                    })
                    .expect(400)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "fail")
                        done()
                    })
            })
        })

        describe('GET /v1/contacts', function () {
            it('should GET all of the contacts that our User allows', function (done) {
                if (!contact_test_org_id) { this.skip() }
                supertest(server_app).get("/v1/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        chai.expect(res.body.data).to.be.instanceOf(Array)
                        chai.expect(res.body.data[0]).to.have.property('id')
                        chai.expect(res.body.data[0]).to.have.property('first_name')
                        chai.expect(res.body.data[0]).to.have.property('surname')
                        chai.expect(res.body.data[0]).to.have.property('email_address')
                        chai.expect(res.body.data[0]).to.have.property('phone_number') // Not checking value, as Voluble may change the format
                        chai.expect(res.body.data[0]).to.have.property('OrganizationId', contact_test_org_id)
                        chai.expect(res.body.data[0]).to.have.property('ServicechainId', contact_test_sc_id)
                        done()
                    })
            })

            it("should fail if we aren't authorized", function (done) {
                if (!contact_test_org_id) { this.skip() }
                supertest(server_app)
                    .get("/v1/contacts")
                    .expect(401)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        done()
                    })
            })
        })

        describe('PUT /v1/contacts', function () {
            it("should change the contact's first and second names", function (done) {
                if (!contact_test_org_id) { this.skip() }
                if (!created_contact_id) { this.skip() }

                let new_first_name = faker.name.firstName()
                let new_surname = faker.name.lastName()
                supertest(server_app)
                    .put(`/v1/contacts/${created_contact_id}`)
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
                if (!contact_test_org_id) { this.skip() }
                if (!created_contact_id) { this.skip() }

                let new_email = faker.internet.exampleEmail()
                supertest(server_app)
                    .put(`/v1/contacts/${created_contact_id}`)
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

            it("should change the contact's phone number", function (done) {
                if (!contact_test_org_id) { this.skip() }
                if (!created_contact_id) { this.skip() }

                let new_phone = faker.phone.phoneNumber("+4474########")
                supertest(server_app)
                    .put(`/v1/contacts/${created_contact_id}`)
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
            it('should remove the contact we created', function (done) {
                if (!contact_test_org_id) { this.skip() }
                if (!created_contact_id) { this.skip() }

                supertest(server_app)
                    .delete(`/v1/contacts/${created_contact_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        done()
                    })
            })

            it('should attempt to remove the same contact again, to ensure idempotence', function (done) {
                if (!contact_test_org_id) { this.skip() }
                if (!created_contact_id) { this.skip() }

                supertest(server_app)
                    .delete(`/v1/contacts/${created_contact_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(410)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        done()
                    })
            })
        })
    })
})