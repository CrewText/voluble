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

let available_services: any[]
describe('/v1/services', function () {

    // Setup auth_token
    this.beforeAll(async function () {
        this.timeout(10000)

        return Promise.all([server.initServer(), getAccessToken()])
            .then(([server, token]) => {
                server_app = server
                auth_token = token
                // done()
                return true
            }).catch(e => { console.error(e); throw e })
    })

    this.afterAll((done) => {
        server.shutdownServer().then(() => { done() })
        // done()
    })

    describe('GET /v1/services', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .get(`/v1/services`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should return a list of available services', function (done) {
            supertest(server_app)
                .get("/v1/services")
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    const response = res.body.data
                    chai.expect(response).to.be.instanceof(Array)

                    response.forEach(service => {
                        satisfiesJsonApiResource(service, 'service')
                    });
                    available_services = response
                    done()
                })
        })
    })

    describe('GET /v1/services/<svc-id>', function () {
        it('should fail if we are not authenticated', function (done) {
            if (!available_services) { this.skip() }
            supertest(server_app)
                .get(`/v1/services/${available_services[0].id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should return the service with the specified ID', function (done) {
            if (!available_services || !auth_token) { this.skip() }
            supertest(server_app)
                .get(`/v1/services/${available_services[0].id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    satisfiesJsonApiResource(res.body.data, 'service', available_services[0].id)

                    done()
                })
        })
    })

    describe('GET /v1/services/count', () => {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .get(`/v1/services/count`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should return the count of services available', function (done) {
            if (!available_services || !auth_token) { this.skip() }
            supertest(server_app)
                .get(`/v1/services/count`)
                .auth(auth_token, { type: 'bearer' })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    chai.expect(res.body.data).to.have.property('count', 3)
                    done()
                })
        })
    })

    describe('POST /v1/services/<svc_id>/', function () {
        it("should fail when we touch an endpoint that doesn't exist", function (done) {

            supertest(server_app)
                .post(`/v1/services/FAKE_SERVICE_NAME/endpoint`)
                .send({ data: 'some data here' })
                .expect(404)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })
    })

    describe('POST /v1/services/<svc_id>/', function () {
        it("should successfully touch a plugin endpoint", function (done) {
            if (!available_services) { this.skip() }
            supertest(server_app)
                .post(`/v1/services/${available_services[0].attributes.directory_name}/endpoint`)
                .send({ data: 'some data here' })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.log(err); console.log(res.error); return done(err) }
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })
    })

})