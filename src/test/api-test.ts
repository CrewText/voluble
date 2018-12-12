process.env.NODE_ENV = "test"
console.log("Node Env: " + process.env.NODE_ENV)

require('dotenv').config() // THIS HAS TO STAY AT THE TOP
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as faker from 'faker';
import * as request from 'request';
import * as server from '../server/server-main';
import * as supertest from 'supertest'
import * as Promise from 'bluebird'
import winston = require('winston');

chai.use(chaiAsPromised)
let should = chai.should
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
                    console.log(`Scopes: ${body.scope}`)
                    done()
                })
            })
    })
    let created_contact_id: string;

    describe('POST /contact', function () {
        it("should create a new contact", function (done) {
            let contact_fname = faker.name.firstName()
            let contact_sname = faker.name.lastName()
            let contact_phone = faker.phone.phoneNumber("+447#########")
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
                    if (err) { return done(err) }
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

    describe('GET /contact', function () {
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

    describe('PUT /contact', function () {
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

    describe('DELETE /contact', function () {
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