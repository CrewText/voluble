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
import * as supertest from 'supertest'
import { Service } from 'voluble-common'
import * as server from '../server/server-main'
import { getAccessToken } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app;

let available_services: Service[]

describe('/v1/services', function () {

    // Setup auth_token
    this.beforeAll(async function () {
        this.timeout(5000)

        return new Promise(async (res, rej) => {
            server_app = await server.initServer()
            auth_token = await getAccessToken()
            res()
        })
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
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

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
                    available_services = <Service[]>response
                    done()
                })
        })
    })

    describe('GET /v1/services/<svc-id>', function () {
        it('should fail if we are not authenticated', function (done) {
            supertest(server_app)
                .get(`/v1/services/${available_services[0].id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.log(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should return the service with the specified ID', function (done) {
            if (!available_services) { this.skip() }
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