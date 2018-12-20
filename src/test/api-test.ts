if (process.env.NODE_ENV != "production") { require('dotenv').config() } // THIS HAS TO STAY AT THE TOP
process.env.NODE_ENV = "test"
console.log("Node Env: " + process.env.NODE_ENV)

import * as Promise from 'bluebird';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as faker from 'faker';
import * as request from 'request';
import * as supertest from 'supertest';
import * as db from '../models';
import * as server from '../server/server-main';
import winston = require('winston');

chai.use(chaiAsPromised)
let auth_token: string
let server_app;

describe('API', function () {
    this.beforeAll(function (done) {

        Promise.try(function () {
            return server.initServer()
        })
            .then(function (svr) {
                //Wait until the DB is up and running before we can use it
                server_app = svr
            })
            .then(function () {
                //@ts-ignore
                faker.locale = "en_GB"

                // Get an access_token from Auth0 on behalf of the Voluble Test Application
                let auth0_req_body = {
                    audience: process.env.AUTH0_API_IDENT,
                    grant_type: "client_credentials",
                    client_id: process.env.AUTH0_TEST_CLIENT_ID,
                    client_secret: process.env.AUTH0_TEST_CLIENT_SECRET
                }

                request.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
                    json: auth0_req_body
                }, function (err, response, body) {
                    if (err) { throw new Error(err) }
                    if (!body.access_token) { throw new Error('No access token in Auth0 response') }
                    auth_token = body.access_token
                    done()
                })
            })
    })

    let created_org: string

    describe('/orgs', function () {

        describe('POST /orgs', function () {
            it('should fail to create a new Organization when a name is not provided', function (done) {
                supertest(server_app)
                    .post("/orgs")
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
                    .post("/orgs")
                    .auth(auth_token, { type: "bearer" })
                    .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+447123456789") })
                    .expect(201)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        created_org = res.body.data.id
                        done()
                    })
            })
        })

        describe('GET /orgs', function () {
            it('should retrieve the new Organization in the collection', function (done) {
                supertest(server_app)
                    .get("/orgs")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.be.instanceOf(Array)
                        chai.expect(res.body.data[0]).to.have.property('id')
                        done()
                    })
            })

            it('should retrieve the created Organization by ID', function (done) {
                if (!created_org) { this.skip() }
                supertest(server_app)
                    .get(`/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        chai.expect(res.body.data.id).to.equal(created_org)
                        done()
                    })
            })

            it('should fail to retrieve the created Organization by ID without authorization', function (done) {
                if (!created_org) { this.skip() }
                supertest(server_app)
                    .get(`/orgs/${created_org}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        done()
                    })
            })
        })

        describe('PUT /orgs', function () {
            it("should change the name of the organization", function (done) {
                if (!created_org) { this.skip() }
                let new_org_name = faker.company.companyName()
                supertest(server_app)
                    .put(`/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        Organization: { name: new_org_name }
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        let new_org = res.body.data
                        chai.expect(new_org).to.have.property('id', created_org)
                        chai.expect(new_org).to.have.property('name', new_org_name)
                        done()
                    })
            })
        })

        describe('DELETE /orgs', function () {
            it('should remove the Org we created', function (done) {
                supertest(server_app)
                    .delete(`/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        done()
                    })
            })

            it('should attempt to remove the same Org, to ensure idempotence', function (done) {
                supertest(server_app)
                    .delete(`/orgs/${created_org}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(404)
                    .end((err, res) => {
                        done()
                    })
            })
        })

        describe('/orgs/<org-id>/users', function () {
            this.beforeAll(function (done) {
                supertest(server_app)
                    .post("/orgs")
                    .auth(auth_token, { type: "bearer" })
                    .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+447426######") })
                    .expect(201)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        created_org = res.body.data.id
                        return done()
                    })
            })

            let created_user_id: string;

            describe('POST /orgs/<org-id>/users', function () {
                it("should create a new user and add it to the Org", function (done) {
                    let new_user_auth0_id = faker.random.uuid()
                    supertest(server_app)
                        .post(`/orgs/${created_org}/users`)
                        .auth(auth_token, { type: "bearer" })
                        .send({ auth0_id: new_user_auth0_id })
                        .expect(201)
                        .end((err, res) => {
                            if (err) { return done(err) }
                            chai.expect(res.body).to.have.property('status', 'success')
                            chai.expect(res.body.data).to.have.property('id')
                            chai.expect(res.body.data).to.have.property('auth0_id', new_user_auth0_id)
                            chai.expect(res.body.data).to.have.property('OrganizationId', created_org)
                            created_user_id = res.body.data.id
                            done()
                        })
                })
            })

            describe('GET /orgs/<org-id>/users', function () {
                console.log(created_user_id)
                it('should retrieve a list of the users in the Org', function (done) {
                    if (!created_org || !created_user_id) { this.skip() }
                    supertest(server_app)
                        .get(`/orgs/${created_org}/users`)
                        .auth(auth_token, { type: "bearer" })
                        .expect(200)
                        .end((err, res) => {
                            if (err) { done(err) }
                            chai.expect(res.body).to.have.property('status', 'success')
                            chai.expect(res.body.data).to.be.instanceOf(Array)
                            chai.expect(res.body.data[0]).to.have.property('id', created_user_id)
                            done()
                        })
                })


                it('should retrieve the individual details of the new user', function (done) {
                    if (!created_org || !created_user_id) { this.skip() }
                    supertest(server_app)
                        .get(`/orgs/${created_org}/users/${created_user_id}`)
                        .auth(auth_token, { type: "bearer" })
                        .expect(200)
                        .end((err, res) => {
                            if (err) { done(err) }
                            chai.expect(res.body).to.have.property('status', 'success')
                            chai.expect(res.body.data).to.have.property('id', created_user_id)
                            done()
                        })
                })
            })

            describe('PUT /orgs/<org-id>/users', function () {
                let created_org_id_new: string;
                this.beforeAll(function (done) {
                    supertest(server_app)
                        .post('/orgs')
                        .auth(auth_token, { type: "bearer" })
                        .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+447426######") })
                        .expect(201)
                        .end(function (err, res) {
                            if (err) { return done(err) }
                            created_org_id_new = res.body.data.id
                            done()
                        })
                })
                it('should add an existing user to a new Org', function (done) {
                    if (!created_user_id || !created_org_id_new) { this.skip() }
                    supertest(server_app)
                        .put(`/orgs/${created_org_id_new}/users`)
                        .auth(auth_token, { type: "bearer" })
                        .send({ user_id: created_user_id })
                        .expect(200)
                        .end((err, res) => {
                            if (err) { done(err) }
                            chai.expect(res.body).to.have.property('status', 'success')
                            let user = res.body.data
                            chai.expect(user).to.have.property('id', created_user_id)
                            chai.expect(user).to.have.property('OrganizationId', created_org_id_new)
                            done()
                        })
                })

                it('should add the same user to the same Org to ensure idempotence', function (done) {
                    if (!created_user_id || !created_org_id_new) { this.skip() }
                    supertest(server_app)
                        .put(`/orgs/${created_org_id_new}/users`)
                        .auth(auth_token, { type: "bearer" })
                        .send({ user_id: created_user_id })
                        .expect(200)
                        .end((err, res) => {
                            if (err) { done(err) }
                            chai.expect(res.body).to.have.property('status', 'success')
                            let user = res.body.data
                            chai.expect(user).to.have.property('id', created_user_id)
                            chai.expect(user).to.have.property('OrganizationId', created_org_id_new)
                            done()
                        })
                })
            })

            describe('DELETE /orgs/<org-id>/users/<user-id>', function () {
                it('should remove the new user from the Org', function (done) {
                    supertest(server_app)
                        .delete(`/orgs/${created_org}/users/${created_user_id}`)
                        .auth(auth_token, { type: "bearer" })
                        .expect(200)
                        .end((err, res) => {
                            if (err) { return done(err) }

                            chai.expect(res.body).to.have.property('status', 'success')
                            chai.expect(res.body).to.have.property('data', true)
                            done()
                        })
                })

                it('should remove the same user again to ensure idempotence', function (done) {
                    supertest(server_app)
                        .delete(`/orgs/${created_org}/users/${created_user_id}`)
                        .auth(auth_token, { type: "bearer" })
                        .expect(404)
                        .end((err, res) => {
                            if (err) { return done(err) }

                            chai.expect(res.body).to.have.property('status', 'success')
                            chai.expect(res.body).to.have.property('data', true)
                            done()
                        })
                })
            })

        })

    })

    let available_services: db.ServiceInstance[];

    describe('/services', function () {

        describe('GET /services', function () {
            it('should return a list of available services', function (done) {
                supertest(server_app)
                    .get("/services")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) { done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        chai.expect(res.body.data).to.be.instanceof(Array)
                        chai.expect(res.body.data[0]).to.have.property('id')
                        available_services = res.body.data
                        done()
                    })
            })
        })

    })

    describe('/servicechains', function () {

        let created_servicechain_id: string;
        describe("POST /servicechains", function () {
            it('should create a new servicechain with a service', function (done) {
                if (!available_services) { this.skip() }
                supertest(server_app)
                    .post("/servicechains")
                    .send({
                        name: "eric the sc",
                        services: [{
                            "service_id": available_services[0].id,
                            "priority": 1
                        }]
                    })
                    .auth(auth_token, { type: "bearer" })
                    .expect(201)
                    .end((err, res) => {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        chai.expect(res.body.data).to.have.property('id')
                        created_servicechain_id = res.body.data.id
                        done()
                    })
            })

            it("should fail when provided with a non-existent service ID", function (done) {
                supertest(server_app)
                    .post("/servicechains")
                    .send({
                        name: "my servicechain",
                        services: [{
                            "service_id": faker.random.uuid(),
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

        describe("GET /servicechains", function () {
            it('should retrieve a list of servicechains for our Org')
        })
    })

    let created_contact_id: string;

    describe('/contacts', function () {

        describe('POST /contacts', function () {
            it("should create a new contact", function (done) {
                let contact_fname = faker.name.firstName()
                let contact_sname = faker.name.lastName()
                let contact_phone = faker.phone.phoneNumber("+447426######")
                let contact_email = faker.internet.email(contact_fname, contact_sname)

                supertest(server_app)
                    .post("/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        first_name: contact_fname,
                        surname: contact_sname,
                        phone_number: contact_phone,
                        email_address: contact_email
                    })
                    .expect(201)
                    .end(function (err, res) {
                        if (err) { console.log(err); console.log(res); return done(err) }
                        chai.expect(res.body).to.have.property('status', "success")
                        chai.expect(res.body.data).to.have.property('id')
                        created_contact_id = res.body.data.id
                        done()
                    })
            })

            it("Should fail to create a new contact when the phone number is invalid", function (done) {
                let contact_fname = faker.name.firstName()
                let contact_sname = faker.name.lastName()
                let contact_phone = "12345123456"
                let contact_email = faker.internet.email(contact_fname, contact_sname)

                supertest(server_app)
                    .post("/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        first_name: contact_fname,
                        surname: contact_sname,
                        phone_number: contact_phone,
                        email_address: contact_email
                    })
                    .expect(400)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', "fail")
                        done()
                    })
            })
        })

        describe('GET /contacts', function () {
            it('should GET all of the contacts that our User allows', function (done) {
                supertest(server_app).get("/contacts")
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        done()
                    })
            })

            it("should fail if we aren't authorized", function (done) {
                supertest(server_app)
                    .get("/contacts")
                    .expect(401)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        done()
                    })
            })
        })

        describe('PUT /contacts', function () {
            it("should change the contact's name", function (done) {
                if (!created_contact_id) { this.skip() }

                let new_first_name = faker.name.firstName()
                let new_surname = faker.name.lastName()
                supertest(server_app)
                    .put(`/contacts/${created_contact_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .send({
                        first_name: new_first_name,
                        surname: new_surname
                    })
                    .expect(200)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        chai.expect(res.body.data).to.have.property('first_name', new_first_name)
                        chai.expect(res.body.data).to.have.property('surname', new_surname)
                        done()
                    })
            })
        })

        describe('DELETE /contacts', function () {
            it('should remove the contact we created', function (done) {
                if (!created_contact_id) { this.skip() }

                supertest(server_app)
                    .delete(`/contacts/${created_contact_id}`)
                    .auth(auth_token, { type: "bearer" })
                    .expect(200)
                    .end(function (err, res) {
                        if (err) { return done(err) }
                        chai.expect(res.body).to.have.property('status', 'success')
                        done()
                    })
            })

            it('should attempt to remove the same contact again, to ensure idempotence', function (done) {
                if (!created_contact_id) { this.skip() }

                supertest(server_app)
                    .delete(`/contacts/${created_contact_id}`)
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