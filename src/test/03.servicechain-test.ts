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
import { Service } from 'voluble-common'

import * as server from '../server/server-main'
import { getAccessToken, satisfiesJsonApiError, satisfiesJsonApiRelatedResource, satisfiesJsonApiResource, satisfiesJsonApiResourceRelationship } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;

describe('/v1/orgs/<org-id>/servicechains', function () {

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
    })

    let test_org_id: string
    let test_services: Service[]
    let created_servicechain_id: string

    // Setup test_org_id
    this.beforeAll((done) => {
        supertest(server_app)
            .post("/v1/orgs/")
            .auth(auth_token, { type: "bearer" })
            .send({ name: faker.company.companyName(), phone_number: faker.phone.phoneNumber("+4474########"), plan: "PAYG" })
            .expect(201)
            .end((err, res) => {
                if (err) { console.log(err); console.log(res.error); return done(err) }
                chai.expect(res.body).to.have.property('data')
                chai.expect(res.body.data).to.have.property('id')
                chai.expect(res.body.data.attributes).to.have.property('name')
                chai.expect(res.body.data.attributes).to.have.property('phone_number')
                test_org_id = res.body.data.id
                done()
            })
    })

    // Setup test_services
    this.beforeAll((done) => {
        supertest(server_app)
            .get("/v1/services")
            .auth(auth_token, { type: "bearer" })
            .expect(200)
            .end((err, res) => {
                if (err) { console.log(err); console.log(res.error); return done(err) }
                chai.expect(res.body).to.have.property('data')
                const response = res.body.data
                chai.expect(response).to.be.instanceof(Array)

                response.forEach(service => {
                    chai.expect(service).to.have.property('id')
                    chai.expect(service.attributes).to.have.property('name')
                    chai.expect(service.attributes).to.have.property('directory_name')
                });
                test_services = response
                done()
            })
    })

    describe("POST /v1/servicechains", function () {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail when provided with a non-existent service ID", function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail when 'services' is not present", function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
                .send({
                    name: "my servicechain",
                })
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail when 'services' is an empty list", function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
                .send({
                    name: "my servicechain",
                    services: []
                })
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail when 'services' is a list containing an empty object", function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
                .send({
                    name: "my servicechain",
                    services: [{}]
                })
                .auth(auth_token, { type: "bearer" })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should create a new servicechain with a service', function (done) {
            if (!test_services || !test_org_id) { this.skip() }
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/servicechains`)
                .send({
                    name: "API Test Servicechain",
                    services: [{
                        "service": test_services[0].id,
                        "priority": 1
                    },
                    {
                        "service": test_services[1].id,
                        "priority": 2
                    }]
                })
                .auth(auth_token, { type: "bearer" })
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        console.error(res.body)
                        return done(err)
                    }
                    chai.expect(res.body).to.have.property('data')

                    const response = res.body.data
                    satisfiesJsonApiResource(response, 'servicechain')
                    satisfiesJsonApiResourceRelationship(response, { 'organization': { 'related': `/orgs/${test_org_id}` } })
                    satisfiesJsonApiRelatedResource(response, 'organization', 'organization', test_org_id)

                    response.attributes.services.forEach(svc => {
                        chai.expect(svc).to.have.property('id')
                        chai.expect(svc).to.have.property('service')
                        chai.expect(svc).to.have.property('servicechain')
                        chai.expect(svc).to.have.property('priority')
                    });
                    created_servicechain_id = response.id
                    done()
                })
        })
    })

    describe("GET /v1/orgs/<org-id>/servicechains", function () {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/servicechains`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should retrieve a list of servicechains for our Org', function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/servicechains`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    const response = res.body.data
                    chai.expect(response).to.be.instanceOf(Array)
                    chai.expect(response).to.have.lengthOf(1)

                    response.forEach(sc => {
                        satisfiesJsonApiResource(sc, 'servicechain')
                        satisfiesJsonApiResourceRelationship(sc, { 'organization': { 'related': `/orgs/${test_org_id}` } })
                        satisfiesJsonApiRelatedResource(sc, 'organization', 'organization', test_org_id)

                        sc.attributes.services.forEach(svc => {
                            chai.expect(svc).to.have.property('id')
                            chai.expect(svc).to.have.property('service')
                            chai.expect(svc).to.have.property('servicechain', created_servicechain_id)
                            chai.expect(svc).to.have.property('priority')
                        });
                    });

                    done()
                })
        })
    })

    describe('GET /v1/orgs/<org_id>/servicechains/count', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/servicechains/count`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should return the count of servicechains available', function (done) {
            if (!created_servicechain_id || !auth_token || !test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/servicechains/count`)
                .auth(auth_token, { type: 'bearer' })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    chai.expect(res.body.data).to.have.property('count', 1)
                    done()
                })
        })
    })

    describe("PUT /v1/orgs/<org-id>/servicechains/<sc-id>", () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should overwrite the existing service in the servicechain", function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    name: "API Test Servicechain Overwrite",
                    services: [{
                        "service": test_services[0].id,
                        "priority": 3
                    }]
                })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }

                    chai.expect(res.body).to.have.property('data')
                    const response = res.body.data
                    satisfiesJsonApiResource(response, 'servicechain', created_servicechain_id)
                    satisfiesJsonApiResourceRelationship(response, { 'organization': { 'related': `/orgs/${test_org_id}` } })
                    satisfiesJsonApiRelatedResource(response, 'organization', 'organization', test_org_id)
                    chai.expect(response.attributes.services).to.have.length(1);
                    response.attributes.services.forEach(svc => {
                        chai.expect(svc).to.have.property('id')
                        chai.expect(svc).to.have.property('service')
                        chai.expect(svc).to.have.property('servicechain', created_servicechain_id)
                        chai.expect(svc).to.have.property('priority')
                    });
                    done()
                })
        })

        it("should fail to overwrite when a non-existent service ID is provided", function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
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
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail to overwrite when a non-integer priority is provided", function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    name: "API Test Servicechain Overwrite",
                    services: [{
                        "service": test_services[0].id,
                        "priority": "three"
                    }]
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it("should fail to overwrite when a 'services' is not a list", function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({
                    name: "API Test Servicechain Overwrite",
                    services: {
                        "service": test_services[0].id,
                        "priority": 2
                    }
                })
                .expect(400)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })
    })

    describe("DELETE /v1/orgs/<org-id>/servicechains/<sc-id>", () => {

        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should remove the SC we created', function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(204)
                .end((err, res) => {
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })

        it('should attempt to remove the same SC, to ensure idempotence', function (done) {
            if (!created_servicechain_id || !test_org_id) { this.skip() }
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/servicechains/${created_servicechain_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(404)
                .end((err, res) => {
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })
    })
})