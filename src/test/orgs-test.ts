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
import * as server from '../server/server-main'
import { getAccessToken } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;
let created_org: string

describe('/v1/orgs', function () {

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
        server.shutdownServer().then(() => { done() })
        // done()
    })
    // })

    describe('POST /v1/orgs', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .post("/v1/orgs")
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

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
                .send({ name: "API Test Organization-POST /orgs", phone_number: faker.phone.phoneNumber("+4474########") })
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
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .get("/v1/orgs")
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

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
    })

    describe('PUT /v1/orgs/<org-id>', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

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
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .delete(`/v1/orgs/${created_org}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

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
                .expect(404)
                .end((err, res) => {
                    done()
                })
        })
    })
})