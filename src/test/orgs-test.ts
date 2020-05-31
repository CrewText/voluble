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
import { getAccessToken, satisfiesJsonApiError, satisfiesJsonApiResource } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;
let created_org: string

describe('/v1/orgs', function () {

    // Setup auth_token
    this.beforeAll(async function () {

        return Promise.all([server.initServer(), getAccessToken()])
            .then(([server, token]) => {
                server_app = server
                auth_token = token
                // done()
                return true
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
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail to create a new Organization when a name is not provided', function (done) {
            supertest(server_app)
                .post("/v1/orgs")
                .send({ phone_number: faker.phone.phoneNumber("+447436######"), plan: "PAYG" })
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail to create a new Organization with an invalid phone number', function (done) {
            supertest(server_app)
                .post("/v1/orgs")
                .send({
                    name: "My Org Name",
                    phone_number: "a phone number", plan: "PAYG"
                })
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should create a new Organization', function (done) {
            supertest(server_app)
                .post("/v1/orgs")
                .auth(auth_token, { type: "bearer" })
                .send({ name: "API Test Organization-POST /orgs", phone_number: faker.phone.phoneNumber("+4474########"), plan: "PAYG" })
                .expect(201)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id')
                    chai.expect(res.body.data.attributes).to.have.property('name')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    chai.expect(res.body.data.attributes).to.have.property('credits', 0)
                    chai.expect(res.body.data.attributes).to.have.property('plan', 'PAYG')
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
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should retrieve the new Organization in the collection', function (done) {
            supertest(server_app)
                .get("/v1/orgs")
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    const response = res.body.data
                    chai.expect(response).to.be.instanceOf(Array)
                    chai.expect(response).to.have.lengthOf(1)


                    satisfiesJsonApiResource(response[0], 'organization')
                    chai.expect(response[0]).to.have.property('id', created_org)
                    chai.expect(response[0].attributes).to.have.property('name')
                    chai.expect(response[0].attributes).to.have.property('phone_number')
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }

                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id', created_org)
                    chai.expect(res.body.data.attributes).to.have.property('name')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
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
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should change the name of the organization", function (done) {
            if (!created_org) { this.skip() }
            const new_org_name = faker.company.companyName()
            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    name: new_org_name
                })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id', created_org)
                    chai.expect(res.body.data.attributes).to.have.property('name', new_org_name)
                    chai.expect(res.body.data.attributes).to.have.property('phone_number')
                    done()
                })
        })

        it("should fail to change the phone number of the organization to an invalid number", function (done) {
            if (!created_org) { this.skip() }

            const new_org_phone = faker.phone.phoneNumber("+4474########")
            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    phone_number: "not a phone number"
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should change the phone number of the organization", function (done) {
            if (!created_org) { this.skip() }

            const new_org_phone = faker.phone.phoneNumber("+4474########")
            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    phone_number: new_org_phone
                })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id', created_org)
                    chai.expect(res.body.data.attributes).to.have.property('name')
                    chai.expect(res.body.data.attributes).to.have.property('phone_number', new_org_phone)
                    done()
                })
        })

        it("should fail to change the plan type of the organization to a non-existent plan", function (done) {
            if (!created_org) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    plan: "NOT_A_REAL_PLAN"
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should change the plan type of the organization", function (done) {
            if (!created_org) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    plan: "PAY_IN_ADVANCE"
                })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id', created_org)
                    chai.expect(res.body.data.attributes).to.have.property('name')
                    chai.expect(res.body.data.attributes).to.have.property('plan', "PAY_IN_ADVANCE")
                    done()
                })
        })

        it("should fail to update the credits count of the organization to a non-numeric value", function (done) {
            if (!created_org) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    credits: "cheese"
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail to update the credits count of the organization to a negative value", function (done) {
            if (!created_org) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    credits: -1
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should update the credits count of the organization", function (done) {
            if (!created_org) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    credits: 1000
                })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')

                    satisfiesJsonApiResource(res.body.data, 'organization')
                    chai.expect(res.body.data).to.have.property('id', created_org)
                    chai.expect(res.body.data.attributes).to.have.property('credits', 1000)
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
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should remove the Org we created', function (done) {
            supertest(server_app)
                .delete(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .expect(204)
                .end((err, res) => {
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })

        it('should attempt to remove the same Org, to ensure idempotence', function (done) {
            supertest(server_app)
                .delete(`/v1/orgs/${created_org}`)
                .auth(auth_token, { type: "bearer" })
                .expect(404)
                .end((err, res) => {
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })
    })
})