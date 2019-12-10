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

import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as faker from 'faker'
import { Server } from 'http'
import * as supertest from 'supertest'
import * as server from '../server/server-main'
import { getAccessToken } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app: Server;

describe('/v1/orgs/<org-id>/categories', function () {

    // Setup auth_token
    this.beforeAll(async function () {
        console.log('Getting auth token')
        this.timeout(5000)

        return new Promise(async (res, rej) => {
            server_app = await server.initServer()
            auth_token = await getAccessToken()
            res()
        })
    })

    this.afterAll((done) => {
        server.shutdownServer().then(() => { done() })
    })

    let test_org_id: string
    let created_cat_id: string

    // Setup test_org_id
    this.beforeAll((done) => {
        console.log('Setting up test Org')
        supertest(server_app)
            .post("/v1/orgs")
            .auth(auth_token, { type: "bearer" })
            .send({ name: "API Test Organization-CATS TEST", phone_number: faker.phone.phoneNumber("+4474########") })
            .expect(201)
            .end((err, res) => {
                if (err) { console.log(err); return done(err) }
                test_org_id = res.body.data.id
                done()
            })
    })

    describe('POST /v1/orgs/<org-id>/categories', () => {
        it('should fail to create a new category if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should fail to create a new category when `name` is not provided', function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .send({})
                .expect(400)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should create a new category', function (done) {
            if (!test_org_id) { this.skip() }
            let cat_name = faker.name.jobArea()
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .send({ name: cat_name })
                .expect(201)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status')
                    chai.expect(res.body.status).to.equal("success")

                    let data: any = res.body.data
                    chai.expect(data).to.have.property('name', cat_name)
                    chai.expect(data).to.have.property('OrganizationId', test_org_id)
                    created_cat_id = data.id
                    done()
                })
        })
    })

    describe('GET /v1/orgs/<org-id>/categories', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should retrieve a list of categories available', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')

                    let data: any = res.body.data
                    chai.expect(data).to.be.instanceOf(Array)

                    data.forEach(cat => {
                        chai.expect(cat).to.have.property('id')
                        chai.expect(cat).to.have.property('name')
                        chai.expect(cat).to.have.property('OrganizationId')
                    });

                    done();
                })
        })
    })

    describe('GET /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should retrieve the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')

                    let data: any = res.body.data
                    chai.expect(data).to.have.property('id', created_cat_id)
                    chai.expect(data).to.have.property('name')
                    chai.expect(data).to.have.property('OrganizationId', test_org_id)
                    done()
                })
        })
    })

    describe('PUT /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should modify the name of the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({ name: "API Test Category Name" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', 'success')
                    let data: any = res.body.data
                    chai.expect(data).to.have.property('id', created_cat_id)
                    chai.expect(data).to.have.property('name', "API Test Category Name")
                    chai.expect(data).to.have.property('OrganizationId', test_org_id)

                    done()
                })
        })
    })

    describe('DELETE /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.have.property('status', "fail")
                    done()
                })
        })

        it('should remove the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', 'success')
                    done()
                })
        })

        it('should remove the same category again, to ensure idempotence', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(404)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('status', 'success')
                    done()
                })
        })
    })

})